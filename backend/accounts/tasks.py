"""
Celery tasks for admin auto-deactivation feature.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def schedule_auto_reactivation(self, admin_userid):
    """
    Scheduled task to auto-reactivate an admin after deactivation period.
    
    Args:
        admin_userid: The userid of the admin to reactivate
    """
    from accounts.services import AdminDeactivationService
    
    try:
        logger.info(f"Executing auto-reactivation for {admin_userid}")
        
        result = AdminDeactivationService.auto_reactivate_admin(admin_userid)
        
        if result['success']:
            logger.info(f"Successfully reactivated {admin_userid}")
        else:
            logger.warning(
                f"Reactivation failed for {admin_userid}: {result['reason']}"
            )
        
        return result
        
    except Exception as exc:
        logger.error(
            f"Error during auto-reactivation of {admin_userid}: {exc}",
            exc_info=True
        )
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@shared_task
def evaluate_admin_feedback_async(admin_userid):
    """
    Asynchronous task to evaluate admin feedback.
    Can be used for batch processing if needed.
    
    Args:
        admin_userid: The userid of the admin to evaluate
    """
    from accounts.services import AdminDeactivationService
    
    try:
        logger.info(f"Evaluating feedback for admin {admin_userid}")
        result = AdminDeactivationService.evaluate_admin_feedback(admin_userid)
        return result
    except Exception as exc:
        logger.error(
            f"Error evaluating feedback for {admin_userid}: {exc}",
            exc_info=True
        )
        raise


@shared_task
def check_missed_reactivations():
    """
    Periodic task to check for and reactivate any admins whose
    24-hour deactivation period has passed but weren't reactivated.
    
    This serves as a fallback in case scheduled tasks fail.
    """
    from django.contrib.auth import get_user_model
    from accounts.services import AdminDeactivationService
    
    User = get_user_model()
    
    # Find users who should be reactivated
    reactivation_threshold = timezone.now() - timedelta(hours=24)
    
    missed_reactivations = User.objects.filter(
        auto_deactivated=True,
        is_active=False,
        auto_deactivated_at__lte=reactivation_threshold
    )
    
    count = 0
    for user in missed_reactivations:
        logger.warning(
            f"Found missed reactivation for {user.userid}, processing now"
        )
        result = AdminDeactivationService.auto_reactivate_admin(user.userid)
        if result['success']:
            count += 1
    
    if count > 0:
        logger.info(f"Processed {count} missed reactivations")
    
    return {'processed': count}