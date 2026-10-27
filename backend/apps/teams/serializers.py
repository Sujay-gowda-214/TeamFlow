from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Team, TeamMember
from apps.users.serializers import UserMiniSerializer

class TeamMemberSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True, source='user')

    class Meta:
        model = TeamMember
        fields = ['id', 'user', 'user_id', 'role', 'joined_at']

class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    created_by = UserMiniSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    project_count = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'created_by', 'members', 'member_count', 'project_count', 'created_at', 'updated_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_project_count(self, obj):
        return obj.projects.count()

class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description']
