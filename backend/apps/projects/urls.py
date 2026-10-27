from django.urls import path
from . import views

urlpatterns = [
    path('', views.projects_list),
    path('<int:pk>/', views.project_detail),
    path('<int:pk>/members/', views.add_project_member),
    path('dashboard/stats/', views.dashboard_stats),
]
