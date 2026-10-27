from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.register),
    path('login/', views.login),
    path('refresh/', TokenRefreshView.as_view()),
    path('me/', views.me),
    path('me/update/', views.update_profile),
    path('me/change-password/', views.change_password),
    path('users/', views.list_users),
]
