from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUserRemote, IssueReportRemote, TrustScoreLogRemote
from .services import calculate_ban_days


class TrustEnforcementTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        existing = set(connection.introspection.table_names())
        with connection.schema_editor() as schema_editor:
            for model in [CustomUserRemote, IssueReportRemote, TrustScoreLogRemote]:
                if model._meta.db_table not in existing:
                    schema_editor.create_model(model)

    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            userid="A10001",
            password="pass",
            department="Road",
            is_root=False,
        )
        self.root_admin = User.objects.create_user(
            userid="R10001",
            password="pass",
            department="Road",
            is_root=True,
        )
        self.other_root = User.objects.create_user(
            userid="R20001",
            password="pass",
            department="Water",
            is_root=True,
        )
        self.reporter = CustomUserRemote.objects.create(trust_score=80)

    def _create_issue(self, **kwargs):
        now = timezone.now()
        defaults = {
            "location": "Block A",
            "issue_description": "Broken street light",
            "image_url": "",
            "issue_date": now - timedelta(days=1),
            "status": "pending",
            "updated_at": now - timedelta(hours=1),
            "user_id": self.reporter.id,
            "issue_title": "Street light issue",
            "tracking_id": f"T{IssueReportRemote.objects.count() + 1}",
            "allocated_to": "",
            "confidence_score": 90,
            "department": "Road",
            "completion_url": "",
            "auto_escalated": False,
            "appeal_status": "not_appealed",
            "trust_score_delta": 0,
        }
        defaults.update(kwargs)
        return IssueReportRemote.objects.create(**defaults)

    def test_reject_applies_minus_ten_exactly_once(self):
        issue = self._create_issue()
        self.client.force_authenticate(user=self.admin)

        url = reverse("issue-status", kwargs={"tracking_id": issue.tracking_id})
        first = self.client.patch(url, {"status": "rejected"}, format="json")
        second = self.client.patch(url, {"status": "rejected"}, format="json")

        issue.refresh_from_db()
        self.reporter.refresh_from_db()

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(issue.status, "rejected")
        self.assertEqual(self.reporter.trust_score, 70)
        self.assertEqual(
            TrustScoreLogRemote.objects.filter(
                report_id=issue.id, reason=TrustScoreLogRemote.Reason.FAKE_REPORT
            ).count(),
            1,
        )

    def test_reject_crossing_threshold_sets_deactivated_until(self):
        self.reporter.trust_score = 75
        self.reporter.save(update_fields=["trust_score"])
        issue = self._create_issue()
        self.client.force_authenticate(user=self.admin)

        url = reverse("issue-status", kwargs={"tracking_id": issue.tracking_id})
        res = self.client.patch(url, {"status": "rejected"}, format="json")

        self.reporter.refresh_from_db()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.reporter.trust_score, 65)
        self.assertIsNotNone(self.reporter.deactivated_until)
        self.assertGreater(self.reporter.deactivated_until, timezone.now())

    def test_ban_duration_formula_expected_samples(self):
        expected = {
            0: 30,
            7: 23,
            15: 18,
            30: 11,
            60: 4,
            120: 1,
            180: 1,
        }
        for gap, days in expected.items():
            self.assertEqual(calculate_ban_days(gap), days)

    def test_reject_while_deactivated_does_not_reduce_trust(self):
        self.reporter.trust_score = 65
        self.reporter.deactivated_until = timezone.now() + timedelta(days=5)
        self.reporter.save(update_fields=["trust_score", "deactivated_until"])
        issue = self._create_issue()
        self.client.force_authenticate(user=self.admin)

        url = reverse("issue-status", kwargs={"tracking_id": issue.tracking_id})
        res = self.client.patch(url, {"status": "rejected"}, format="json")

        self.reporter.refresh_from_db()
        issue.refresh_from_db()
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(self.reporter.trust_score, 65)
        self.assertEqual(issue.trust_score_delta, 0)
        self.assertEqual(
            TrustScoreLogRemote.objects.filter(
                report_id=issue.id, reason=TrustScoreLogRemote.Reason.FAKE_REPORT
            ).count(),
            0,
        )

    def test_appeal_accept_gives_plus_thirteen_and_reopens_issue(self):
        issue = self._create_issue(status="rejected", appeal_status="pending", trust_score_delta=-10)
        self.reporter.trust_score = 60
        self.reporter.save(update_fields=["trust_score"])
        self.client.force_authenticate(user=self.root_admin)

        url = reverse("issue-appeal-decision", kwargs={"tracking_id": issue.tracking_id})
        res = self.client.patch(url, {"decision": "accepted"}, format="json")

        issue.refresh_from_db()
        self.reporter.refresh_from_db()

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(issue.status, "pending")
        self.assertEqual(issue.appeal_status, "accepted")
        self.assertEqual(self.reporter.trust_score, 73)
        self.assertEqual(
            TrustScoreLogRemote.objects.filter(
                report_id=issue.id, reason=TrustScoreLogRemote.Reason.APPEAL_ACCEPTED
            ).count(),
            1,
        )

    def test_appeal_reject_finalizes_and_blocks_further_decisions(self):
        issue = self._create_issue(status="rejected", appeal_status="pending", trust_score_delta=-10)
        self.reporter.trust_score = 58
        self.reporter.save(update_fields=["trust_score"])
        self.client.force_authenticate(user=self.root_admin)
        url = reverse("issue-appeal-decision", kwargs={"tracking_id": issue.tracking_id})

        first = self.client.patch(url, {"decision": "rejected"}, format="json")
        second = self.client.patch(url, {"decision": "accepted"}, format="json")

        issue.refresh_from_db()
        self.reporter.refresh_from_db()
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(issue.appeal_status, "rejected")
        self.assertEqual(self.reporter.trust_score, 58)
        self.assertEqual(
            TrustScoreLogRemote.objects.filter(
                report_id=issue.id, reason=TrustScoreLogRemote.Reason.APPEAL_ACCEPTED
            ).count(),
            0,
        )

    def test_permission_checks_admin_vs_root_admin_for_appeal_decision(self):
        issue = self._create_issue(status="rejected", appeal_status="pending", trust_score_delta=-10)
        url = reverse("issue-appeal-decision", kwargs={"tracking_id": issue.tracking_id})

        self.client.force_authenticate(user=self.admin)
        non_root_res = self.client.patch(url, {"decision": "accepted"}, format="json")

        self.client.force_authenticate(user=self.other_root)
        other_dept_root_res = self.client.patch(url, {"decision": "accepted"}, format="json")

        self.client.force_authenticate(user=self.admin)
        reject_url = reverse("issue-status", kwargs={"tracking_id": issue.tracking_id})
        normal_admin_reject_res = self.client.patch(reject_url, {"status": "rejected"}, format="json")

        self.assertEqual(non_root_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(other_dept_root_res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(normal_admin_reject_res.status_code, status.HTTP_200_OK)
