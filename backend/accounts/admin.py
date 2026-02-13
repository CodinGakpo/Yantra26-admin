from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, ActivityLog

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("userid", "full_name", "email", "department", "is_root", "is_staff", "is_active")
    list_filter = ("is_root", "is_staff", "is_active", "department")
    search_fields = ("userid", "full_name", "email", "department")
    ordering = ("userid",)
    
    fieldsets = (
        (None, {"fields": ("userid", "password")}),
        ("Personal info", {"fields": ("full_name", "email", "department")}),
        ("Permissions", {"fields": ("is_root", "is_staff", "is_superuser", "is_active", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login",)}),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("userid", "password1", "password2", "full_name", "email", "department", "is_root", "is_active"),
        }),
    )
    
    readonly_fields = ("last_login",)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "performed_by", "action", "target_user", "ip_address")
    list_filter = ("action", "timestamp")
    search_fields = ("performed_by__userid", "target_user", "details")
    ordering = ("-timestamp",)
    readonly_fields = ("timestamp", "performed_by", "target_user", "action", "details", "ip_address")
    
    def has_add_permission(self, request):
        # Prevent manual creation of logs through admin
        return False
    
    def has_change_permission(self, request, obj=None):
        # Prevent editing of logs
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete the logs
        return request.user.is_superuser