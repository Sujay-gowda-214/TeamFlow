from rest_framework import serializers
from .models import Comment
from apps.users.serializers import UserMiniSerializer

class CommentSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task', 'user', 'text', 'created_at', 'updated_at']
        read_only_fields = ['task', 'user']

class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['text']
