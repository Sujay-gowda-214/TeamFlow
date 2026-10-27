from rest_framework import serializers
from .models import Project
from apps.users.serializers import UserMiniSerializer
from apps.teams.serializers import TeamSerializer
from apps.teams.models import TeamMember

class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserMiniSerializer(read_only=True)
    members = UserMiniSerializer(many=True, read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    progress = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()
    task_done_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'team', 'team_name', 'created_by',
            'members', 'start_date', 'end_date', 'status', 'priority',
            'progress', 'task_count', 'task_done_count', 'created_at', 'updated_at'
        ]

    def get_progress(self, obj):
        return obj.progress

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_task_done_count(self, obj):
        return obj.tasks.filter(status='done').count()

class ProjectCreateSerializer(serializers.ModelSerializer):
    def validate_team(self, team):
        request = self.context.get('request')
        if request and not TeamMember.objects.filter(team=team, user=request.user).exists():
            raise serializers.ValidationError('You must be a member of the selected team.')
        return team

    def validate(self, attrs):
        start_date = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'End date cannot be before the start date.'})
        return attrs

    class Meta:
        model = Project
        fields = ['name', 'description', 'team', 'start_date', 'end_date', 'status', 'priority']
