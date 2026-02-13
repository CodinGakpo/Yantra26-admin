from rest_framework.permissions import BasePermission

class IsRootUser(BasePermission):
    """
    Allows access only to authenticated users with is_root == True.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "is_root", False))
