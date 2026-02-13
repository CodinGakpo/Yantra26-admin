from django.urls import path
from .views import (
    RegisterView, MeView, PresignS3UploadView, 
    DeleteUserView, ListUsersView, ToggleUserStatusView, ActivityLogsView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("presign-s3/", PresignS3UploadView.as_view(), name="presign-s3"),
    
    path("users/", ListUsersView.as_view(), name="list_users"),
    path("users/<str:userid>/delete/", DeleteUserView.as_view(), name="delete_user"),
    path("users/<str:userid>/toggle-status/", ToggleUserStatusView.as_view(), name="toggle_user_status"),
    path("activity-logs/", ActivityLogsView.as_view(), name="activity_logs"),
]