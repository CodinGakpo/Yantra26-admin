from django.contrib import admin

from .models import Sensor, SensorReport


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = ("sensorId", "lat", "lng", "isActive")
    search_fields = ("sensorId",)
    list_filter = ("isActive",)


@admin.register(SensorReport)
class SensorReportAdmin(admin.ModelAdmin):
    list_display = ("alert_id", "sensor", "hazard", "department", "status", "timestamp", "isAcknowledged", "isResolved")
    search_fields = ("sensor__sensorId", "hazard", "department")
    list_filter = ("status", "department", "isAcknowledged", "isResolved")
    readonly_fields = ("createdAt",)
