"""
Service layer for handling admin auto-deactivation based on feedback.
NO CELERY VERSION - Uses database polling for reactivation.

SPECIAL NOTE: This version works with read-only IssueReportRemote model
that doesn't have ManyToMany fields. It queries likes/dislikes directly from DB.
"""
from django.utils import timezone
from django.db import transaction, connection
from django.contrib.auth import get_user_model
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class AdminDeactivationService:
    """
    Handles auto-deactivation logic for admins based on feedback metrics.
    """
    
    # Thresholds
    MIN_DISLIKES = 20
    DISLIKE_RATIO_THRESHOLD = 0.60
    DEACTIVATION_DURATION_HOURS = 24
    
    @classmethod
    def evaluate_admin_feedback(cls, admin_userid):
        """
        Evaluate an admin's feedback and deactivate if thresholds are met.
        
        Args:
            admin_userid: The userid of the admin to evaluate
            
        Returns:
            dict: Status information about the evaluation
        """
        try:
            user = User.objects.select_for_update().get(userid=admin_userid)
        except User.DoesNotExist:
            logger.warning(f"User {admin_userid} not found for evaluation")
            return {'success': False, 'reason': 'user_not_found'}
        
        # Skip if root user
        if user.is_root:
            logger.info(f"Skipping auto-deactivation for root user {admin_userid}")
            return {'success': False, 'reason': 'root_user'}
        
        # Skip if already auto-deactivated
        if user.auto_deactivated and user.is_active is False:
            logger.info(f"User {admin_userid} already auto-deactivated")
            return {'success': False, 'reason': 'already_deactivated'}
        
        # Calculate feedback metrics
        metrics = cls._calculate_feedback_metrics(admin_userid)
        
        logger.info(
            f"Feedback metrics for {admin_userid}: "
            f"dislikes={metrics['total_dislikes']}, "
            f"total_votes={metrics['total_votes']}, "
            f"ratio={metrics['dislike_ratio']:.2%}"
        )
        
        # Check if thresholds are met
        should_deactivate = (
            metrics['total_dislikes'] >= cls.MIN_DISLIKES and
            metrics['dislike_ratio'] >= cls.DISLIKE_RATIO_THRESHOLD
        )
        
        if should_deactivate:
            return cls._auto_deactivate_admin(user, metrics)
        
        return {
            'success': False,
            'reason': 'thresholds_not_met',
            'metrics': metrics
        }
    
    @classmethod
    def _calculate_feedback_metrics(cls, admin_userid):
        """
        Calculate aggregated feedback metrics for an admin.
        Queries likes/dislikes directly from database since IssueReportRemote
        doesn't have ManyToMany fields.
        """
        from remote_report.models import IssueReportRemote
        
        # Get all report IDs allocated to this admin
        report_ids = list(
            IssueReportRemote.objects
            .filter(allocated_to=admin_userid)
            .values_list('id', flat=True)
        )
        
        if not report_ids:
            return {
                'total_dislikes': 0,
                'total_likes': 0,
                'total_votes': 0,
                'dislike_ratio': 0
            }
        
        # Query likes and dislikes directly from database
        with connection.cursor() as cursor:
            # Count total likes for these reports
            cursor.execute("""
                SELECT COUNT(*) 
                FROM report_issuereport_likes 
                WHERE issuereport_id IN %s
            """, [tuple(report_ids)])
            total_likes = cursor.fetchone()[0]
            
            # Count total dislikes for these reports
            cursor.execute("""
                SELECT COUNT(*) 
                FROM report_issuereport_dislikes 
                WHERE issuereport_id IN %s
            """, [tuple(report_ids)])
            total_dislikes = cursor.fetchone()[0]
        
        total_votes = total_dislikes + total_likes
        dislike_ratio = total_dislikes / total_votes if total_votes > 0 else 0
        
        return {
            'total_dislikes': total_dislikes,
            'total_likes': total_likes,
            'total_votes': total_votes,
            'dislike_ratio': dislike_ratio
        }
    
    @classmethod
    @transaction.atomic
    def _auto_deactivate_admin(cls, user, metrics):
        """
        Perform the auto-deactivation with proper transaction handling.
        """
        # Double-check to prevent duplicate deactivations
        user.refresh_from_db()
        if user.auto_deactivated and not user.is_active:
            return {'success': False, 'reason': 'race_condition_prevented'}
        
        # Deactivate the user
        user.is_active = False
        user.auto_deactivated = True
        user.auto_deactivated_at = timezone.now()
        user.auto_reactivation_scheduled = False  # Not using scheduled tasks
        user.save(update_fields=[
            'is_active', 
            'auto_deactivated', 
            'auto_deactivated_at',
            'auto_reactivation_scheduled'
        ])
        
        # Log the activity
        cls._log_auto_deactivation(user, metrics)
        
        logger.warning(
            f"Auto-deactivated admin {user.userid} - "
            f"dislikes: {metrics['total_dislikes']}, "
            f"ratio: {metrics['dislike_ratio']:.2%}"
        )
        
        return {
            'success': True,
            'action': 'deactivated',
            'metrics': metrics,
            'reactivation_time': user.auto_deactivated_at + timedelta(
                hours=cls.DEACTIVATION_DURATION_HOURS
            )
        }
    
    @classmethod
    def _log_auto_deactivation(cls, user, metrics):
        """
        Create an activity log entry for auto-deactivation.
        """
        from accounts.models import ActivityLog
        
        details = (
            f"Auto-deactivated due to negative feedback. "
            f"Dislikes: {metrics['total_dislikes']}, "
            f"Ratio: {metrics['dislike_ratio']:.2%}, "
            f"Total votes: {metrics['total_votes']}"
        )
        
        ActivityLog.objects.create(
            performed_by=None,  # System action
            target_user=user.userid,
            action='auto_deactivate',
            details=details,
            ip_address=None
        )
    
    @classmethod
    @transaction.atomic
    def auto_reactivate_admin(cls, admin_userid):
        """
        Reactivate an admin after the deactivation period.
        
        Args:
            admin_userid: The userid of the admin to reactivate
            
        Returns:
            dict: Status information about the reactivation
        """
        try:
            user = User.objects.select_for_update().get(userid=admin_userid)
        except User.DoesNotExist:
            logger.error(f"User {admin_userid} not found for reactivation")
            return {'success': False, 'reason': 'user_not_found'}
        
        # Verify this is an auto-deactivated account
        if not user.auto_deactivated:
            logger.warning(
                f"Attempted to auto-reactivate {admin_userid} "
                f"but account was not auto-deactivated"
            )
            return {'success': False, 'reason': 'not_auto_deactivated'}
        
        # Check if deactivation period has elapsed
        if user.auto_deactivated_at:
            elapsed = timezone.now() - user.auto_deactivated_at
            if elapsed < timedelta(hours=cls.DEACTIVATION_DURATION_HOURS):
                logger.warning(
                    f"Attempted early reactivation of {admin_userid}. "
                    f"Only {elapsed} has elapsed."
                )
                return {'success': False, 'reason': 'too_early'}
        
        # Reactivate the user
        user.is_active = True
        user.auto_deactivated = False
        user.auto_deactivated_at = None
        user.auto_reactivation_scheduled = False
        user.save(update_fields=[
            'is_active',
            'auto_deactivated',
            'auto_deactivated_at',
            'auto_reactivation_scheduled'
        ])
        
        # Log the activity
        cls._log_auto_reactivation(user)
        
        logger.info(f"Auto-reactivated admin {user.userid}")
        
        return {
            'success': True,
            'action': 'reactivated',
            'userid': user.userid
        }
    
    @classmethod
    def _log_auto_reactivation(cls, user):
        """
        Create an activity log entry for auto-reactivation.
        """
        from accounts.models import ActivityLog
        
        ActivityLog.objects.create(
            performed_by=None,  # System action
            target_user=user.userid,
            action='auto_reactivate',
            details="Automatically reactivated after 24-hour suspension period",
            ip_address=None
        )
    
    @classmethod
    def process_pending_reactivations(cls):
        """
        Process all users who are due for reactivation.
        This should be called periodically (e.g., by a cron job or middleware).
        
        Returns:
            dict: Summary of processed reactivations
        """
        reactivation_threshold = timezone.now() - timedelta(hours=cls.DEACTIVATION_DURATION_HOURS)
        
        # Find users who should be reactivated
        users_to_reactivate = User.objects.filter(
            auto_deactivated=True,
            is_active=False,
            auto_deactivated_at__lte=reactivation_threshold
        )
        
        reactivated_count = 0
        failed_count = 0
        
        for user in users_to_reactivate:
            result = cls.auto_reactivate_admin(user.userid)
            if result['success']:
                reactivated_count += 1
            else:
                failed_count += 1
                logger.error(
                    f"Failed to reactivate {user.userid}: {result.get('reason')}"
                )
        
        logger.info(
            f"Processed reactivations: {reactivated_count} successful, {failed_count} failed"
        )
        
        return {
            'reactivated': reactivated_count,
            'failed': failed_count,
            'total_processed': reactivated_count + failed_count
        }
    
classmethod
def evaluate_all_admins(cls):
    """
    Evaluate all non-root, active admins for auto-deactivation.
    This should be called periodically (e.g., every 5 minutes via middleware or cron).
    
    Returns:
        dict: Summary of evaluations
    """
    # Get all admins who should be evaluated
    # Don't include already auto-deactivated ones
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    admins = User.objects.filter(
        is_root=False,
        is_active=True,
        auto_deactivated=False
    )
    
    evaluated_count = 0
    deactivated_count = 0
    
    for admin in admins:
        # Each evaluation needs its own transaction
        # since evaluate_admin_feedback now wraps everything in transaction.atomic()
        result = cls.evaluate_admin_feedback(admin.userid)
        evaluated_count += 1
        
        if result.get('success'):
            deactivated_count += 1
            logger.warning(
                f"Auto-deactivated {admin.userid} during batch evaluation"
            )
    
    logger.info(
        f"Batch evaluation: {evaluated_count} admins evaluated, "
        f"{deactivated_count} deactivated"
    )
    
    return {
        'evaluated': evaluated_count,
        'deactivated': deactivated_count
    }