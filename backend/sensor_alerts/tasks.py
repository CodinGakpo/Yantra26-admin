import logging
from threading import Thread

from django.conf import settings
from django.core.mail import send_mail

from .models import SensorReport

logger = logging.getLogger(__name__)


def send_sensor_alert_email(report_id):
    report = SensorReport.objects.select_related("sensor").get(alert_id=report_id)

    subject = f"[ALERT] {report.hazard} detected - {report.sensor.sensorId}"
    message = (
        f"Sensor: {report.sensor.sensorId}\n"
        f"Location: ({report.sensor.lat}, {report.sensor.lng})\n"
        f"Hazard: {report.hazard}\n"
        f"Department: {report.department}\n"
        f"Status: {report.status}\n"
        f"Time: {report.timestamp.isoformat()}\n\n"
        f"Sensor Values:\n{report.sensorValues}"
    )

    admin_email = getattr(settings, "ADMIN_ALERT_EMAIL", "admin@example.com")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@example.com")

    sent = send_mail(subject, message, from_email, [admin_email], fail_silently=False)
    logger.info("Sensor alert email send result: report_id=%s sent=%s", report_id, bool(sent))


def trigger_alert_email(report_id):
    def _runner():
        try:
            send_sensor_alert_email(report_id)
        except Exception:
            logger.exception("Sensor alert email failed for report_id=%s", report_id)

    Thread(target=_runner, daemon=True).start()
