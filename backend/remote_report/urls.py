from django.urls import path
from .views import (
    IssueListView,
    IssueDetailView,
    IssueResolveView,
    IssueStatusUpdateView,
    IssuePDFView,
)

urlpatterns = [
    path("issues/", IssueListView.as_view(), name="issue-list"),
    path("issues/<str:tracking_id>/", IssueDetailView.as_view(), name="issue-detail"),
    path(
        "issues/<str:tracking_id>/status/",
        IssueStatusUpdateView.as_view(),
        name="issue-status",
    ),
    path(
        "issues/<str:tracking_id>/resolve/",
        IssueResolveView.as_view(),
        name="issue-resolve",
    ),
    path(
        "issues/<str:tracking_id>/pdf/",
        IssuePDFView.as_view(),
        name="issue-pdf",
    ),
]
