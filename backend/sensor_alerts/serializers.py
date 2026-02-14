from rest_framework import serializers

from .models import SensorReport


class SensorReportSerializer(serializers.Serializer):
    sensorId = serializers.CharField()
    lat = serializers.FloatField()
    lng = serializers.FloatField()
    hazard = serializers.CharField()
    dept = serializers.CharField()
    location = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=["TRIGGERED", "CLEARED"])
    sensor_values = serializers.JSONField()
    timestamp = serializers.DateTimeField()

    def validate(self, attrs):
        sensor = self.context.get("sensor")
        if sensor and attrs.get("sensorId") != sensor.sensorId:
            raise serializers.ValidationError({"sensorId": "sensorId does not match API key"})
        return attrs


class SensorAlertSerializer(serializers.ModelSerializer):
    sensorId = serializers.CharField(source="sensor.sensorId", read_only=True)
    lat = serializers.FloatField(source="sensor.lat", read_only=True)
    lng = serializers.FloatField(source="sensor.lng", read_only=True)

    class Meta:
        model = SensorReport
        fields = [
            "alert_id",
            "sensorId",
            "lat",
            "lng",
            "hazard",
            "department",
            "location",
            "status",
            "sensorValues",
            "timestamp",
            "createdAt",
            "isAcknowledged",
            "acknowledgedAt",
            "isResolved",
            "resolvedAt",
        ]
