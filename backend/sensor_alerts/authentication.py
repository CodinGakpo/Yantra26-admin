from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Sensor


class SensorAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION")
        if not header:
            return None

        try:
            token_type, api_key = header.split()
        except ValueError as exc:
            raise AuthenticationFailed("Invalid header") from exc

        if token_type != "Sensor":
            raise AuthenticationFailed("Invalid token prefix")

        try:
            sensor = Sensor.objects.get(apiKey=api_key, isActive=True)
        except Sensor.DoesNotExist as exc:
            raise AuthenticationFailed("Invalid API Key") from exc

        return (sensor, None)
