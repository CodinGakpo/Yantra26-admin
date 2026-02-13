from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Get the user
        data = super().validate(attrs)
        
        # Check if user is active
        if not self.user.is_active:
            # Check if this is an auto-deactivation
            if self.user.auto_deactivated and self.user.auto_deactivated_at:
                # Calculate when they'll be reactivated
                reactivation_time = self.user.auto_deactivated_at + timedelta(hours=24)
                time_remaining = reactivation_time - timezone.now()
                
                if time_remaining.total_seconds() > 0:
                    hours_remaining = int(time_remaining.total_seconds() // 3600)
                    minutes_remaining = int((time_remaining.total_seconds() % 3600) // 60)
                    
                    raise serializers.ValidationError(
                        f"Your account has been temporarily suspended due to negative feedback. "
                        f"It will be automatically reactivated in {hours_remaining}h {minutes_remaining}m. "
                        f"Please contact your department supervisor for more information."
                    )
                else:
                    # Deactivation period has passed, but reactivation task hasn't run yet
                    raise serializers.ValidationError(
                        "Your account is being reactivated. Please try again in a few minutes."
                    )
            else:
                # Manual deactivation by root admin
                raise serializers.ValidationError(
                    "Your account has been deactivated by the root administrator. "
                    "Please contact your system administrator for assistance."
                )
        
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer