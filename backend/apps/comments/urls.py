from django.urls import path
from . import views

urlpatterns = [
    path('task/<int:task_id>/', views.task_comments),
    path('<int:pk>/', views.comment_detail),
]
