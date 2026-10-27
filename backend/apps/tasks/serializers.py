from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Task, ActivityLog
from apps.users.serializers import UserMiniSerializer
from apps.teams.models import TeamMember

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserMiniSerializer(read_only=True)
    created_by = UserMiniSerializer(read_only=True)
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        write_only=True, source='assigned_to', required=False, allow_null=True
    )
    project_name = serializers.CharField(source='project.name', read_only=True)
    comment_count = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project', 'project_name',
            'assigned_to', 'assigned_to_id', 'created_by',
            'deadline', 'priority', 'status', 'tags',
            'estimated_hours', 'actual_hours',
            'comment_count', 'is_overdue', 'created_at', 'updated_at'
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()

    def get_is_overdue(self, obj):
        if obj.deadline and obj.status not in ['done']:
            from django.utils import timezone
            return obj.deadline < timezone.now()
        return False

class TaskCreateSerializer(serializers.ModelSerializer):
    estimated_hours = serializers.FloatField(required=False, allow_null=True, min_value=0)
    actual_hours = serializers.FloatField(required=False, allow_null=True, min_value=0)

    def validate(self, attrs):
        project = attrs.get('project', getattr(self.instance, 'project', None))
        assigned_to = attrs.get('assigned_to', getattr(self.instance, 'assigned_to', None))
        request = self.context.get('request')
        if project and request and not TeamMember.objects.filter(team=project.team, user=request.user).exists():
            raise serializers.ValidationError({'project': 'You must belong to the task project team.'})
        if assigned_to and project and not TeamMember.objects.filter(team=project.team, user=assigned_to).exists():
            raise serializers.ValidationError({'assigned_to': 'The assignee must belong to the project team.'})
        return attrs

    class Meta:
        model = Task
        fields = ['title', 'description', 'project', 'assigned_to', 'deadline', 'priority', 'status', 'tags', 'estimated_hours', 'actual_hours']

class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'action', 'entity_type', 'entity_id', 'description', 'created_at']
