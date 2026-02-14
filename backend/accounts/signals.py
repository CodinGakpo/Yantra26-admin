"""
Signal handlers for admin auto-deactivation based on feedback.
"""
from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@receiver(m2m_changed, sender=None)  # Will be connected in apps.py
def handle_feedback_change(sender, instance, action, pk_set, **kwargs):
    """
    Handle changes to likes/dislikes on IssueReportRemote.
    Triggers admin evaluation when feedback is added.
    
    Args:
        sender: The through model for the M2M relationship
        instance: The IssueReportRemote instance
        action: The M2M action (pre_add, post_add, pre_remove, post_remove, etc.)
        pk_set: Set of primary keys being added/removed
    """
    # Only process post_add and post_remove actions
    if action not in ['post_add', 'post_remove']:
        return
    
    # Import here to avoid circular imports
    from remote_report.models import IssueReportRemote
    
    # Verify this is a feedback signal
    if not isinstance(instance, IssueReportRemote):
        return
    
    # Check if this report is allocated to an admin
    allocated_admin = instance.allocated_to
    if not allocated_admin:
        logger.debug(f"Report {instance.tracking_id} has no allocated admin, skipping")
        return
    
    # Trigger evaluation after transaction commits to ensure data consistency
    transaction.on_commit(lambda: _trigger_admin_evaluation(allocated_admin, instance))


def _trigger_admin_evaluation(admin_userid, report):
    """
    Trigger the evaluation of an admin's feedback metrics.
    
    Args:
        admin_userid: The userid of the admin to evaluate
        report: The IssueReportRemote that triggered this evaluation
    """
    from accounts.services import AdminDeactivationService
    
    logger.info(
        f"Triggering feedback evaluation for admin {admin_userid} "
        f"due to feedback on report {report.tracking_id}"
    )
    
    try:
        result = AdminDeactivationService.evaluate_admin_feedback(admin_userid)
        
        if result.get('success'):
            logger.warning(
                f"Admin {admin_userid} auto-deactivated: {result}"
            )
        elif result.get('reason') == 'thresholds_not_met':
            logger.debug(
                f"Admin {admin_userid} thresholds not met: "
                f"{result.get('metrics')}"
            )
        
    except Exception as exc:
        logger.error(
            f"Error evaluating admin {admin_userid}: {exc}",
            exc_info=True
        )