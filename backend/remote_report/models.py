from django.db import models

class IssueReportRemote(models.Model):
    id = models.BigAutoField(primary_key=True)
    location = models.CharField(max_length=255)
    issue_description = models.TextField()
    image_url = models.CharField(max_length=1000, null=True, blank=True)
    issue_date = models.DateTimeField()
    status = models.CharField(max_length=50)
    updated_at = models.DateTimeField()
    user_id = models.IntegerField()
    issue_title = models.CharField(max_length=255)
    tracking_id = models.CharField(max_length=32, null=True, blank=True)
    allocated_to = models.CharField(max_length=255, null=True, blank=True)
    confidence_score = models.IntegerField(null=True, blank=True)
    department = models.CharField(max_length=255, null=True, blank=True)
    completion_url = models.CharField(max_length=1000, null=True, blank=True)
    auto_escalated = models.BooleanField(default=False)
    appeal_status = models.CharField(max_length=32, null=True, blank=True)
    trust_score_delta = models.IntegerField(null=True, blank=True)
    class Meta:
        managed = False
        db_table = "report_issuereport"
        ordering = ["-issue_date"]

    def __str__(self):
        return f"{self.tracking_id or self.id} — {self.issue_title[:40]}"


class CustomUserRemote(models.Model):
    id = models.BigAutoField(primary_key=True)
    trust_score = models.IntegerField(default=100)
    deactivated_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = "users_customuser"


class TrustScoreLogRemote(models.Model):
    class Reason(models.TextChoices):
        FAKE_REPORT = "FAKE_REPORT", "FAKE_REPORT"
        APPEAL_ACCEPTED = "APPEAL_ACCEPTED", "APPEAL_ACCEPTED"
        POST_BAN_RESTORE = "POST_BAN_RESTORE", "POST_BAN_RESTORE"
        ISSUE_RESOLVED = "ISSUE_RESOLVED", "ISSUE_RESOLVED"
        MANUAL_ADMIN_ADJUSTMENT = "MANUAL_ADMIN_ADJUSTMENT", "MANUAL_ADMIN_ADJUSTMENT"

    class AppealStatus(models.TextChoices):
        NOT_APPEALED = "not_appealed", "not_appealed"
        PENDING = "pending", "pending"
        ACCEPTED = "accepted", "accepted"
        REJECTED = "rejected", "rejected"

    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    delta = models.IntegerField()
    reason = models.CharField(max_length=64, choices=Reason.choices)
    report_id = models.BigIntegerField(null=True, blank=True)
    appeal_status = models.CharField(
        max_length=32,
        choices=AppealStatus.choices,
        default=AppealStatus.NOT_APPEALED,
    )
    admin_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = "users_trustscorelog"
