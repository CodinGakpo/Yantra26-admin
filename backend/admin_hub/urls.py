from django.contrib import admin
from django.urls import path, include
from .views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("restapi/", include("remote_report.urls")),
]
urlpatterns.append(
    path('api/health', health_check)
)
