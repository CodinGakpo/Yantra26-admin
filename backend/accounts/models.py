from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class UserManager(BaseUserManager):
    def create_user(self, userid, password=None, is_root=False, department="", full_name="", **extra_fields):
        if not userid:
            raise ValueError("Users must have a userid")
        user = self.model(
            userid=userid,
            is_root=is_root,
            department=department,
            full_name=full_name,
            **extra_fields
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, userid, password, **extra_fields):
        user = self.create_user(userid, password, is_root=True, **extra_fields)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    userid = models.CharField(max_length=6, unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(blank=True)
    department = models.CharField(max_length=100, blank=True)
    is_root = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    
    # Auto-deactivation fields
    auto_deactivated = models.BooleanField(default=False)
    auto_deactivated_at = models.DateTimeField(null=True, blank=True)
    auto_reactivation_scheduled = models.BooleanField(default=False)
    
    objects = UserManager()

    USERNAME_FIELD = "userid"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.userid

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Account Created'),
        ('delete', 'Account Deleted'),
        ('activate', 'Account Activated'),
        ('deactivate', 'Account Deactivated'),
        ('auto_deactivate', 'Auto-Deactivated (Feedback)'),
        ('auto_reactivate', 'Auto-Reactivated'),
        ('login', 'Login'),
        ('logout', 'Logout'),
    ]
    
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='actions_performed')
    target_user = models.CharField(max_length=6)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.performed_by} - {self.action} - {self.target_user}"