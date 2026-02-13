"""
Middleware to process auto-deactivation and reactivation.

Since IssueReportRemote doesn't have likes/dislikes fields (it's read-only),
we can't use signals. Instead, this middleware periodically:
1. Evaluates all admins for deactivation based on feedback
2. Reactivates admins whose suspension period has ended
"""
from django.core.cache import cache
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class AutoDeactivationMiddleware:
    """
    Middleware that periodically checks for:
    - Admins who should be deactivated (based on feedback)
    - Admins who should be reactivated (24h suspension over)
    
    Uses cache to ensure we don't check on every single request.
    Default interval: 5 minutes between checks.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Separate cache keys for each operation
        self.eval_cache_key = 'auto_deactivation_last_eval'
        self.reactivation_cache_key = 'auto_reactivation_last_check'
        # How often to check (in seconds) - default 5 minutes
        self.check_interval = 300
    
    def __call__(self, request):
        # Check if we should evaluate admins for deactivation
        self._maybe_evaluate_admins()
        
        # Check if we should process reactivations
        self._maybe_process_reactivations()
        
        response = self.get_response(request)
        return response
    
    def _maybe_evaluate_admins(self):
        """
        Periodically evaluate all admins for auto-deactivation.
        """
        last_check = cache.get(self.eval_cache_key)
        now = timezone.now()
        
        # If no last check or interval has passed
        if last_check is None or (now - last_check).total_seconds() >= self.check_interval:
            try:
                from accounts.services import AdminDeactivationService
                
                logger.debug("Evaluating admins for auto-deactivation via middleware")
                result = AdminDeactivationService.evaluate_all_admins()
                
                if result['deactivated'] > 0:
                    logger.warning(
                        f"Middleware auto-deactivated {result['deactivated']} admin(s)"
                    )
                
                # Update cache with current time
                cache.set(self.eval_cache_key, now, timeout=None)
                
            except Exception as e:
                logger.error(f"Error in admin evaluation middleware: {e}", exc_info=True)
    
    def _maybe_process_reactivations(self):
        """
        Periodically process pending reactivations.
        """
        last_check = cache.get(self.reactivation_cache_key)
        now = timezone.now()
        
        # If no last check or interval has passed
        if last_check is None or (now - last_check).total_seconds() >= self.check_interval:
            try:
                from accounts.services import AdminDeactivationService
                
                logger.debug("Processing pending reactivations via middleware")
                result = AdminDeactivationService.process_pending_reactivations()
                
                if result['reactivated'] > 0:
                    logger.info(f"Middleware reactivated {result['reactivated']} admin(s)")
                
                # Update cache with current time
                cache.set(self.reactivation_cache_key, now, timeout=None)
                
            except Exception as e:
                logger.error(f"Error in auto-reactivation middleware: {e}", exc_info=True)