from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Get the user
        data = super().validate(attrs)
        
        # Check if user is active
        if not self.user.is_active:
            raise serializers.ValidationError(
                "Your account has been deactivated by the root administrator. "
                "Please contact your system administrator for assistance."
            )
        
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer