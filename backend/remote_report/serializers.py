from rest_framework import serializers
from .models import IssueReportRemote, CustomUserRemote

class IssueReportSerializer(serializers.ModelSerializer):
    user_trust_score = serializers.SerializerMethodField()
    user_deactivated_until = serializers.SerializerMethodField()

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
            "appeal_status",
            "trust_score_delta",
            "user_trust_score",
            "user_deactivated_until",
        ]

    def get_user_trust_score(self, obj):
        user = CustomUserRemote.objects.filter(id=obj.user_id).only("trust_score").first()
        return user.trust_score if user else None

    def get_user_deactivated_until(self, obj):
        user = CustomUserRemote.objects.filter(id=obj.user_id).only("deactivated_until").first()
        return user.deactivated_until if user else None
