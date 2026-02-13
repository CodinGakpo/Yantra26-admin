# test_simple.py
"""
Simplified test for auto-deactivation - Windows compatible.
No special Unicode characters that cause encoding errors.
"""

from django.contrib.auth import get_user_model
from django.db import transaction, connection
from accounts.services import AdminDeactivationService

User = get_user_model()

print("=" * 70)
print("AUTO-DEACTIVATION TEST")
print("=" * 70)

# Import IssueReportRemote
try:
    from remote_report.models import IssueReportRemote
    print("OK: IssueReportRemote imported successfully")
except ImportError as e:
    print(f"ERROR: Cannot import IssueReportRemote: {e}")
    exit()

# Get test admin
admin = User.objects.filter(is_root=False, is_active=True).first()
if not admin:
    print("ERROR: No non-root admin found")
    exit()

print(f"\n1. Testing with admin: {admin.userid}")
print(f"   - Department: {admin.department}")
print(f"   - Currently active: {admin.is_active}")

# Get current metrics
print("\n2. Calculating feedback metrics...")
metrics = AdminDeactivationService._calculate_feedback_metrics(admin.userid)
print(f"   - Total dislikes: {metrics['total_dislikes']}")
print(f"   - Total likes: {metrics['total_likes']}")
print(f"   - Dislike ratio: {metrics['dislike_ratio']:.2%}")

threshold_met = (
    metrics['total_dislikes'] >= 20 and 
    metrics['dislike_ratio'] >= 0.60
)
print(f"   - Threshold status: {'MET' if threshold_met else 'NOT MET'}")

# Check reports
report_count = IssueReportRemote.objects.filter(allocated_to=admin.userid).count()
print(f"\n3. Found {report_count} report(s) allocated to admin")

# Test evaluation logic (WITH TRANSACTION)
print(f"\n4. Testing evaluation logic...")
try:
    with transaction.atomic():
        result = AdminDeactivationService.evaluate_admin_feedback(admin.userid)
    
    print(f"   - Result: {result.get('reason') or result.get('action')}")
    
    if result.get('success'):
        print(f"   - SUCCESS: Admin auto-deactivated!")
    else:
        print(f"   - Not triggered: {result.get('reason')}")
        
except Exception as e:
    print(f"   - ERROR: {e}")

# Check admin status
admin.refresh_from_db()
print(f"\n5. Admin current status:")
print(f"   - is_active: {admin.is_active}")
print(f"   - auto_deactivated: {admin.auto_deactivated}")
print(f"   - auto_deactivated_at: {admin.auto_deactivated_at}")

# Check activity logs
from accounts.models import ActivityLog
recent_logs = ActivityLog.objects.filter(
    target_user=admin.userid
).order_by('-timestamp')[:3]

print(f"\n6. Recent activity logs:")
if recent_logs.exists():
    for log in recent_logs:
        print(f"   - {log.action}: {log.details[:60]}")
else:
    print(f"   - (no activity logs)")

# Test batch operations (WITH TRANSACTIONS)
print("\n" + "=" * 70)
print("TESTING BATCH OPERATIONS")
print("=" * 70)

print("\n7. Testing evaluate_all_admins()...")
try:
    # This needs to be wrapped in transaction too
    result = AdminDeactivationService.evaluate_all_admins()
    print(f"   - Evaluated: {result['evaluated']} admins")
    print(f"   - Deactivated: {result['deactivated']} admins")
except Exception as e:
    print(f"   - ERROR: {e}")

print("\n8. Testing process_pending_reactivations()...")
try:
    result = AdminDeactivationService.process_pending_reactivations()
    print(f"   - Reactivated: {result['reactivated']} admins")
    print(f"   - Failed: {result['failed']} admins")
except Exception as e:
    print(f"   - ERROR: {e}")

# Final verdict
print("\n" + "=" * 70)
print("TEST RESULTS")
print("=" * 70)

if threshold_met and admin.auto_deactivated:
    print("SUCCESS: Auto-deactivation working!")
    print(f"Admin {admin.userid} was deactivated")
elif threshold_met and not admin.auto_deactivated:
    print("WARNING: Thresholds met but admin NOT deactivated")
    print("Possible reasons:")
    print("- Admin is root user")
    print("- Already manually deactivated")
    print("- Error during evaluation")
else:
    print("INFO: Thresholds not met (expected)")
    print(f"Current: {metrics['total_dislikes']} dislikes ({metrics['dislike_ratio']:.2%})")
    print("Required: >=20 dislikes AND >=60% ratio")
    
    dislikes_needed = max(0, 20 - metrics['total_dislikes'])
    if dislikes_needed > 0:
        print(f"Need {dislikes_needed} more dislikes")

print("\n" + "=" * 70)
print("NOTE: Middleware runs every 5 minutes automatically")
print("Make sure it's enabled in settings.MIDDLEWARE")
print("=" * 70)