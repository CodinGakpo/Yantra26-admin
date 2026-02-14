from django.db import models


class Sensor(models.Model):
    sensorId = models.CharField(max_length=50, unique=True)
    lat = models.FloatField()
    lng = models.FloatField()
    apiKey = models.CharField(max_length=64, unique=True)
    isActive = models.BooleanField(default=True)

    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.sensorId


class SensorReport(models.Model):
    STATUS_TRIGGERED = "TRIGGERED"
    STATUS_CLEARED = "CLEARED"
    STATUS_CHOICES = [
        (STATUS_TRIGGERED, "Triggered"),
        (STATUS_CLEARED, "Cleared"),
    ]

    alert_id = models.BigAutoField(primary_key=True)
    sensor = models.ForeignKey(Sensor, on_delete=models.CASCADE, related_name="reports")
    hazard = models.CharField(max_length=50)
    department = models.CharField(max_length=100)
    location = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    sensorValues = models.JSONField(default=dict)
    rawPayload = models.JSONField(default=dict)

    timestamp = models.DateTimeField()
    createdAt = models.DateTimeField(auto_now_add=True)

    isAcknowledged = models.BooleanField(default=False)
    acknowledgedAt = models.DateTimeField(null=True, blank=True)
    isResolved = models.BooleanField(default=False)
    resolvedAt = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["department"]),
            models.Index(fields=["isResolved"]),
        ]

    def __str__(self):
        return f"{self.sensor.sensorId} - {self.hazard} - {self.status}"
