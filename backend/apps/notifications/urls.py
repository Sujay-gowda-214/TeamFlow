from django.urls import path
from . import views

urlpatterns = [
    path('', views.notifications_list),
    path('<int:pk>/read/', views.mark_read),
    path('read-all/', views.mark_all_read),
    path('<int:pk>/', views.delete_notification),
]
