from django.urls import path

from .views import (
    ActiveSensorAlertListView,
    SensorAlertAcknowledgeView,
    SensorAlertListView,
    SensorAlertResolveView,
    SensorReportView,
)

urlpatterns = [
    path("sensors/report/", SensorReportView.as_view(), name="sensor-report"),
    path("sensor-alerts/", SensorAlertListView.as_view(), name="sensor-alerts"),
    path("sensor-alerts/active/", ActiveSensorAlertListView.as_view(), name="sensor-alerts-active"),
    path("sensor-alerts/<int:alert_id>/ack/", SensorAlertAcknowledgeView.as_view(), name="sensor-alert-ack"),
    path("sensor-alerts/<int:alert_id>/resolve/", SensorAlertResolveView.as_view(), name="sensor-alert-resolve"),
]
