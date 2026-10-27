from django.urls import path
from . import views

urlpatterns = [
    path('', views.teams_list),
    path('<int:pk>/', views.team_detail),
    path('<int:pk>/members/', views.add_member),
    path('<int:pk>/members/<int:user_id>/', views.remove_member),
]
