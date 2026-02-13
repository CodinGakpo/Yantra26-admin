import math
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import CustomUserRemote, TrustScoreLogRemote

TRUST_MIN = 0
TRUST_MAX = 110
REJECT_DELTA = -10
APPEAL_ACCEPT_DELTA = 13
TRUST_BAN_THRESHOLD = 70
BMIN = 1
BMAX = 30
D = 30


def calculate_ban_days(days_since_last_violation, bmin=BMIN, bmax=BMAX, decay=D):
    return math.floor(bmin + (bmax - bmin) * math.exp(-(days_since_last_violation / decay)))


def _clamp_trust_score(score):
    return max(TRUST_MIN, min(TRUST_MAX, score))


def _is_currently_deactivated(user, now):
    return bool(user.deactivated_until and user.deactivated_until > now)


@transaction.atomic
def apply_trust_mutation(
    *,
    user_id,
    delta,
    reason,
    report_id,
    admin_id,
    appeal_status=TrustScoreLogRemote.AppealStatus.NOT_APPEALED,
    now=None,
):
    now = now or timezone.now()
    user = CustomUserRemote.objects.select_for_update().get(id=user_id)

    # Trust freeze: active deactivation blocks further negative mutations.
    if delta < 0 and _is_currently_deactivated(user, now):
        return {
            "user": user,
            "applied": False,
            "effective_delta": 0,
            "log": None,
        }

    current_score = user.trust_score or TRUST_MAX
    next_score = _clamp_trust_score(current_score + delta)
    effective_delta = next_score - current_score

    user.trust_score = next_score
    user.save(update_fields=["trust_score"])

    log = TrustScoreLogRemote.objects.create(
        user_id=user_id,
        delta=effective_delta,
        reason=reason,
        report_id=report_id,
        appeal_status=appeal_status,
        admin_id=admin_id,
    )
    return {
        "user": user,
        "applied": True,
        "effective_delta": effective_delta,
        "log": log,
    }


def apply_reject_penalty(*, report, admin_user, now=None):
    now = now or timezone.now()

    if report.status == "rejected" and TrustScoreLogRemote.objects.filter(
        report_id=report.id,
        reason=TrustScoreLogRemote.Reason.FAKE_REPORT,
    ).exists():
        user = CustomUserRemote.objects.get(id=report.user_id)
        return {
            "already_applied": True,
            "applied": False,
            "effective_delta": report.trust_score_delta if report.trust_score_delta is not None else 0,
            "user": user,
            "ban_days": 0,
        }

    mutation = apply_trust_mutation(
        user_id=report.user_id,
        delta=REJECT_DELTA,
        reason=TrustScoreLogRemote.Reason.FAKE_REPORT,
        report_id=report.id,
        appeal_status=report.appeal_status or TrustScoreLogRemote.AppealStatus.NOT_APPEALED,
        admin_id=admin_user.id,
        now=now,
    )

    user = mutation["user"]
    report.status = "rejected"
    report.trust_score_delta = mutation["effective_delta"] if mutation["applied"] else 0
    if not report.appeal_status:
        report.appeal_status = TrustScoreLogRemote.AppealStatus.NOT_APPEALED

    # Ban is evaluated when penalty actually applies.
    ban_days = 0
    if mutation["applied"] and user.trust_score < TRUST_BAN_THRESHOLD:
        previous_log = (
            TrustScoreLogRemote.objects.filter(
                user_id=report.user_id,
                reason=TrustScoreLogRemote.Reason.FAKE_REPORT,
            )
            .exclude(id=mutation["log"].id)
            .order_by("-created_at")
            .first()
        )
        days_since_last_violation = 0
        if previous_log and previous_log.created_at:
            delta = now - previous_log.created_at
            days_since_last_violation = max(0, delta.days)

        ban_days = calculate_ban_days(days_since_last_violation)
        user.deactivated_until = now + timedelta(days=ban_days)
        user.save(update_fields=["deactivated_until"])

    report.updated_at = now
    report.save(update_fields=["status", "trust_score_delta", "appeal_status", "updated_at"])

    return {
        "already_applied": False,
        "applied": mutation["applied"],
        "effective_delta": mutation["effective_delta"],
        "user": user,
        "ban_days": ban_days,
    }


def adjudicate_appeal(*, report, decision, admin_user, now=None):
    now = now or timezone.now()
    decision = (decision or "").lower()

    if report.appeal_status != TrustScoreLogRemote.AppealStatus.PENDING:
        raise ValueError("Appeal is not pending")

    if decision not in (
        TrustScoreLogRemote.AppealStatus.ACCEPTED,
        TrustScoreLogRemote.AppealStatus.REJECTED,
    ):
        raise ValueError("Invalid appeal decision")

    if decision == TrustScoreLogRemote.AppealStatus.REJECTED:
        report.appeal_status = TrustScoreLogRemote.AppealStatus.REJECTED
        report.updated_at = now
        report.save(update_fields=["appeal_status", "updated_at"])
        return {
            "decision": decision,
            "effective_delta": 0,
            "user": CustomUserRemote.objects.get(id=report.user_id),
        }

    if TrustScoreLogRemote.objects.filter(
        report_id=report.id,
        reason=TrustScoreLogRemote.Reason.APPEAL_ACCEPTED,
    ).exists():
        raise ValueError("Appeal already finalized")

    if report.status != "rejected":
        raise ValueError("Appeal can only be accepted for rejected reports")

    mutation = apply_trust_mutation(
        user_id=report.user_id,
        delta=APPEAL_ACCEPT_DELTA,
        reason=TrustScoreLogRemote.Reason.APPEAL_ACCEPTED,
        report_id=report.id,
        appeal_status=TrustScoreLogRemote.AppealStatus.ACCEPTED,
        admin_id=admin_user.id,
        now=now,
    )

    report.appeal_status = TrustScoreLogRemote.AppealStatus.ACCEPTED
    report.status = "pending"
    report.trust_score_delta = mutation["effective_delta"]
    report.updated_at = now
    report.save(update_fields=["appeal_status", "status", "trust_score_delta", "updated_at"])
    return {
        "decision": decision,
        "effective_delta": mutation["effective_delta"],
        "user": mutation["user"],
    }
