# test_signal_fixed.py
from django.contrib.auth import get_user_model

User = get_user_model()

# Get test admin
admin = User.objects.filter(is_root=False).first()
print(f"Testing with admin: {admin.userid}")

# Import IssueReport - try different import paths
try:
    from remote_report.models import IssueReport
    print("✓ IssueReport imported successfully")
except ImportError as e:
    print(f"✗ Cannot import IssueReport: {e}")
    print("\nAvailable models in remote_report:")
    import remote_report.models as rm
    print([attr for attr in dir(rm) if not attr.startswith('_')])
    exit()

# Find a report allocated to this admin
report = IssueReport.objects.filter(allocated_to=admin.userid).first()

if not report:
    print(f"\n⚠️  No reports allocated to admin {admin.userid}")
    print("Creating a test report...")
    
    # Create a test report
    test_user = User.objects.filter(is_root=False).exclude(userid=admin.userid).first()
    report = IssueReport.objects.create(
        user=test_user,
        location="Test Location",
        issue_description="Test issue for signal testing",
        allocated_to=admin.userid,
        department=admin.department
    )
    print(f"✓ Created test report: {report.tracking_id}")

print(f"\nUsing report: {report.tracking_id}")

# Get a user to add dislike
feedback_user = User.objects.filter(is_root=False).exclude(userid=admin.userid).first()

if not feedback_user:
    print("✗ No users available to add feedback")
    exit()

print(f"Adding dislike from {feedback_user.userid}...")

# Check current metrics before
from accounts.services import AdminDeactivationService
metrics_before = AdminDeactivationService._calculate_feedback_metrics(admin.userid)
print(f"\nMetrics BEFORE:")
print(f"  - Dislikes: {metrics_before['total_dislikes']}")
print(f"  - Likes: {metrics_before['total_likes']}")
print(f"  - Ratio: {metrics_before['dislike_ratio']:.2%}")

# Add dislike - this should trigger the signal
print(f"\nAdding dislike...")
report.dislikes.add(feedback_user)
print("✓ Dislike added")

# Check metrics after
metrics_after = AdminDeactivationService._calculate_feedback_metrics(admin.userid)
print(f"\nMetrics AFTER:")
print(f"  - Dislikes: {metrics_after['total_dislikes']}")
print(f"  - Likes: {metrics_after['total_likes']}")
print(f"  - Ratio: {metrics_after['dislike_ratio']:.2%}")

# Check if signal triggered by looking at recent activity logs
from accounts.models import ActivityLog
recent_logs = ActivityLog.objects.filter(
    target_user=admin.userid
).order_by('-timestamp')[:5]

print(f"\nRecent activity logs for {admin.userid}:")
if recent_logs.exists():
    for log in recent_logs:
        print(f"  - {log.action}: {log.details[:100]}")
else:
    print("  (no activity logs yet)")

# Check admin status
admin.refresh_from_db()
print(f"\nAdmin status:")
print(f"  - is_active: {admin.is_active}")
print(f"  - auto_deactivated: {admin.auto_deactivated}")

if metrics_after['total_dislikes'] >= 20 and metrics_after['dislike_ratio'] >= 0.60:
    if admin.auto_deactivated:
        print("\n✓ SUCCESS: Admin was auto-deactivated (thresholds met)")
    else:
        print("\n⚠️  WARNING: Thresholds met but admin NOT deactivated - check signal connection")
else:
    print(f"\n✓ Thresholds not met (need ≥20 dislikes and ≥60% ratio)")
    print(f"  Need {max(0, 20 - metrics_after['total_dislikes'])} more dislikes to reach threshold")