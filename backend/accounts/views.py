from rest_framework import generics, status
from rest_framework.response import Response
from .serializers import RegisterSerializer, UserSerializer, ActivityLogSerializer
from .permissions import IsRootUser
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.conf import settings
from .models import ActivityLog
import boto3
import uuid
import os

def log_activity(performed_by, target_user, action, details="", request=None):
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0]
        else:
            ip_address = request.META.get('REMOTE_ADDR')
    
    ActivityLog.objects.create(
        performed_by=performed_by,
        target_user=target_user,
        action=action,
        details=details,
        ip_address=ip_address
    )

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsRootUser]

    def perform_create(self, serializer):
        user = serializer.save(
            is_root=False,
            department=self.request.user.department
        )
        log_activity(
            performed_by=self.request.user,
            target_user=user.userid,
            action='create',
            details=f"Created account for {user.full_name}",
            request=self.request
        )

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        return Response(UserSerializer(user).data)

class ListUsersView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def get(self, request):
        User = get_user_model()
        users = User.objects.filter(
            department=request.user.department,
            is_root=False
        ).exclude(userid=request.user.userid).values(
            'userid', 'full_name', 'email', 'department', 'is_active'
        )
        return Response(list(users))

class DeleteUserView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def delete(self, request, userid):
        User = get_user_model()
        
        if request.user.userid == userid:
            return Response(
                {"error": "Cannot delete your own account"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(userid=userid)
            if user.is_root:
                return Response(
                    {"error": "Cannot delete root users"},
                    status=status.HTTP_403_FORBIDDEN
                )

            log_activity(
                performed_by=request.user,
                target_user=user.userid,
                action='delete',
                details=f"Deleted account {user.full_name}",
                request=request
            )
            
            user.delete()
            return Response(
                {"message": f"User {userid} deleted successfully"},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class ToggleUserStatusView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def patch(self, request, userid):
        User = get_user_model()
        
        if request.user.userid == userid:
            return Response(
                {"error": "Cannot modify your own account status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(userid=userid)
            
            if user.is_root:
                return Response(
                    {"error": "Cannot modify root user status"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            user.is_active = not user.is_active
            user.save()
            
            action = 'activate' if user.is_active else 'deactivate'
            log_activity(
                performed_by=request.user,
                target_user=user.userid,
                action=action,
                details=f"{'Activated' if user.is_active else 'Deactivated'} account {user.full_name}",
                request=request
            )
            
            return Response({
                "message": f"User {userid} {'activated' if user.is_active else 'deactivated'} successfully",
                "is_active": user.is_active
            })
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class ActivityLogsView(APIView):
    permission_classes = [IsAuthenticated, IsRootUser]

    def get(self, request):
        logs = ActivityLog.objects.filter(
            performed_by__department=request.user.department
        ).select_related('performed_by')[:100]
        
        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)

class PresignS3UploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_name = request.data.get("fileName")
        content_type = request.data.get("contentType")

        if not file_name or not content_type:
            raise ValidationError("fileName and contentType are required")

        ext = os.path.splitext(file_name)[1]
        key = f"completion/{request.user.department}/{uuid.uuid4()}{ext}"

        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )

        try:
            url = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
                    "Key": key,
                    "ContentType": content_type,
                },
                ExpiresIn=300,
            )
        except Exception as e:
            raise ValidationError(str(e))

        return Response({"url": url, "key": key})