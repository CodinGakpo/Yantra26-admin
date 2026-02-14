from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import User
from sensor_alerts.models import Sensor, SensorReport


class SensorReportIngestTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.sensor = Sensor.objects.create(
            sensorId="ESP32_01",
            lat=12.9716,
            lng=77.5946,
            apiKey="sensor-key-123",
            isActive=True,
        )
        self.url = reverse("sensor-report")
        self.payload = {
            "sensorId": "ESP32_01",
            "lat": 12.9716,
            "lng": 77.5946,
            "hazard": "FIRE",
            "dept": "Fire Department",
            "location": "Building A, Sector 12, Bengaluru, Karnataka, India",
            "status": "TRIGGERED",
            "sensor_values": {"mq2_level": 0.35},
            "timestamp": "2026-02-14T11:23:04Z",
        }

    def test_missing_api_key_returns_401(self):
        response = self.client.post(self.url, self.payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch("sensor_alerts.views.trigger_alert_email")
    def test_triggered_report_creates_row_and_triggers_email(self, mock_trigger):
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
            HTTP_AUTHORIZATION="Sensor sensor-key-123",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SensorReport.objects.count(), 1)
        mock_trigger.assert_called_once()

    @patch("sensor_alerts.views.trigger_alert_email")
    def test_cleared_report_does_not_trigger_email(self, mock_trigger):
        payload = {**self.payload, "status": "CLEARED"}
        response = self.client.post(
            self.url,
            payload,
            format="json",
            HTTP_AUTHORIZATION="Sensor sensor-key-123",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_trigger.assert_not_called()


class SensorAlertAdminTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            userid="A12345",
            password="testpass123",
            department="Fire Department",
            full_name="Admin User",
        )
        self.client.force_authenticate(user=self.user)

        sensor = Sensor.objects.create(
            sensorId="ESP32_02",
            lat=12.9716,
            lng=77.5946,
            apiKey="sensor-key-456",
            isActive=True,
        )
        self.report = SensorReport.objects.create(
            sensor=sensor,
            hazard="FIRE",
            department="Fire Department",
            location="Warehouse B, Industrial Zone, Bengaluru, Karnataka, India",
            status="TRIGGERED",
            sensorValues={"mq2_level": 0.9},
            rawPayload={"hazard": "FIRE"},
            timestamp=timezone.now(),
        )

    def test_active_endpoint_lists_triggered_alerts(self):
        response = self.client.get(reverse("sensor-alerts-active"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_ack_and_resolve_update_flags(self):
        ack_response = self.client.patch(
            reverse("sensor-alert-ack", kwargs={"alert_id": self.report.alert_id}),
            format="json",
        )
        self.assertEqual(ack_response.status_code, status.HTTP_200_OK)

        resolve_response = self.client.patch(
            reverse("sensor-alert-resolve", kwargs={"alert_id": self.report.alert_id}),
            format="json",
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)

        self.report.refresh_from_db()
        self.assertTrue(self.report.isAcknowledged)
        self.assertTrue(self.report.isResolved)
        self.assertEqual(self.report.status, "CLEARED")
