import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import SensorAuthentication
from .models import SensorReport
from .serializers import SensorAlertSerializer, SensorReportSerializer
from .tasks import trigger_alert_email

logger = logging.getLogger(__name__)


class SensorReportView(APIView):
    authentication_classes = [SensorAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SensorReportSerializer(data=request.data, context={"sensor": request.user})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        sensor = request.user

        if sensor.lat != data["lat"] or sensor.lng != data["lng"]:
            sensor.lat = data["lat"]
            sensor.lng = data["lng"]
            sensor.save(update_fields=["lat", "lng"])

        report = SensorReport.objects.create(
            sensor=sensor,
            hazard=data["hazard"],
            department=data["dept"],
            location=data.get("location") or f'{data["lat"]}, {data["lng"]}',
            status=data["status"],
            sensorValues=data["sensor_values"],
            rawPayload=request.data,
            timestamp=data["timestamp"],
        )

        logger.info(
            "ALERT LOG sensorId=%s hazard=%s timestamp=%s dept=%s report_id=%s",
            sensor.sensorId,
            report.hazard,
            report.timestamp.isoformat(),
            report.department,
            report.alert_id,
        )
        logger.info("Sensor report request payload report_id=%s payload=%s", report.alert_id, request.data)

        if report.status == SensorReport.STATUS_TRIGGERED:
            trigger_alert_email(report.alert_id)

        logger.info("Sensor report response status=201 report_id=%s", report.alert_id)
        return Response({"message": "Sensor report received"}, status=status.HTTP_201_CREATED)


class SensorAlertListView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        queryset = SensorReport.objects.select_related("sensor").all()
        if not request.user.is_root:
            queryset = queryset.filter(department=request.user.department)
        return queryset

    def get(self, request):
        status_filter = request.GET.get("status")
        reports = self.get_queryset(request)

        if status_filter:
            reports = reports.filter(status=status_filter)

        serializer = SensorAlertSerializer(reports, many=True)
        return Response(serializer.data)


class ActiveSensorAlertListView(SensorAlertListView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = self.get_queryset(request).filter(
            status=SensorReport.STATUS_TRIGGERED,
            isResolved=False,
        )
        serializer = SensorAlertSerializer(reports, many=True)
        return Response(serializer.data)


class SensorAlertAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, alert_id):
        report = get_object_or_404(SensorReport.objects.select_related("sensor"), alert_id=alert_id)

        if not request.user.is_root and report.department != request.user.department:
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        if not report.isAcknowledged:
            report.isAcknowledged = True
            report.acknowledgedAt = timezone.now()
            report.save(update_fields=["isAcknowledged", "acknowledgedAt"])

        return Response({"message": "Alert acknowledged", "alert_id": report.alert_id})


class SensorAlertResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, alert_id):
        report = get_object_or_404(SensorReport.objects.select_related("sensor"), alert_id=alert_id)

        if not request.user.is_root and report.department != request.user.department:
            return Response({"detail": "Access denied"}, status=status.HTTP_403_FORBIDDEN)

        if not report.isResolved:
            report.isResolved = True
            report.resolvedAt = timezone.now()
            report.status = SensorReport.STATUS_CLEARED
            report.save(update_fields=["isResolved", "resolvedAt", "status"])

        return Response({"message": "Alert resolved", "alert_id": report.alert_id})
