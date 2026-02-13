from rest_framework import serializers
from .models import IssueReportRemote

class IssueReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = IssueReportRemote
        fields = [
            "id",
            "tracking_id",
            "issue_title",
            "location",
            "issue_description",
            "issue_date",
            "updated_at",
            "status",
            "department",
            "allocated_to",
            "confidence_score",
            "image_url",
            "completion_url",
        ]
