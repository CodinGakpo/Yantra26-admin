from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    
    def ready(self):
        """
        Import and connect signal handlers when Django starts.
        
        NOTE: Since IssueReportRemote doesn't have likes/dislikes ManyToMany fields,
        we can't use signals. Instead, we'll use periodic evaluation via middleware.
        """
        # No signal setup needed - using periodic evaluation instead
        pass