# test_middleware.py
from accounts.services import AdminDeactivationService
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

User = get_user_model()

# Manually deactivate a test user (simulate auto-deactivation)
admin = User.objects.filter(is_root=False).first()
admin.is_active = False
admin.auto_deactivated = True
admin.auto_deactivated_at = timezone.now() - timedelta(hours=25)  # 25 hours ago
admin.save()

print(f"Test admin {admin.userid} manually deactivated (25h ago)")
print("Now testing reactivation...")

# Manually trigger reactivation process (simulating middleware)
result = AdminDeactivationService.process_pending_reactivations()

print(f"Result: {result}")

# Check if user was reactivated
admin.refresh_from_db()
print(f"Admin is_active: {admin.is_active}")
print(f"Admin auto_deactivated: {admin.auto_deactivated}")