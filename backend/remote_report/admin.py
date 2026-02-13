from django.contrib import admin
from .models import IssueReportRemote

@admin.register(IssueReportRemote)
class IssueReportRemoteAdmin(admin.ModelAdmin):
    list_display = ("tracking_id", "user_id", "issue_title", "location", "status", "issue_date")
    search_fields = ("tracking_id", "issue_title", "location", "department")
    readonly_fields = [f.name for f in IssueReportRemote._meta.fields]
    list_per_page = 25
