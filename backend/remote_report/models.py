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
    class Meta:
        managed = False
        db_table = "report_issuereport"
        ordering = ["-issue_date"]

    def __str__(self):
        return f"{self.tracking_id or self.id} — {self.issue_title[:40]}"