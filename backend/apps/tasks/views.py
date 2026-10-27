from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Task, ActivityLog
from .serializers import TaskSerializer, TaskCreateSerializer, ActivityLogSerializer
from apps.teams.models import TeamMember
from apps.projects.models import Project
from apps.notifications.utils import create_notification

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def tasks_list(request):
    if request.method == 'GET':
        user_team_ids = TeamMember.objects.filter(user=request.user).values_list('team_id', flat=True)
        tasks = Task.objects.filter(
            project__team_id__in=user_team_ids
        ).select_related('assigned_to__profile', 'created_by__profile', 'project')

        project_id = request.query_params.get('project')
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        assigned_to_me = request.query_params.get('my_tasks')

        if project_id:
            tasks = tasks.filter(project_id=project_id)
        if status_filter:
            tasks = tasks.filter(status=status_filter)
        if priority_filter:
            tasks = tasks.filter(priority=priority_filter)
        if assigned_to_me == 'true':
            tasks = tasks.filter(assigned_to=request.user)

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    serializer = TaskCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        task = serializer.save(created_by=request.user)
        ActivityLog.objects.create(
            user=request.user,
            action='created',
            entity_type='task',
            entity_id=task.id,
            description=f'Created task "{task.title}"'
        )
        if task.assigned_to and task.assigned_to != request.user:
            create_notification(
                user=task.assigned_to,
                title='New Task Assigned',
                message=f'You have been assigned the task "{task.title}" in project "{task.project.name}".',
                notification_type='task_assigned',
            )
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    try:
        task = Task.objects.select_related('assigned_to__profile', 'created_by__profile', 'project__team').get(pk=pk, project__team__members__user=request.user)
    except Task.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TaskSerializer(task).data)

    if request.method == 'PUT':
        old_status = task.status
        old_assignee = task.assigned_to
        serializer = TaskCreateSerializer(task, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated_task = serializer.save()
            desc_parts = []
            if old_status != updated_task.status:
                desc_parts.append(f'status changed from {old_status} to {updated_task.status}')
            if desc_parts:
                ActivityLog.objects.create(
                    user=request.user,
                    action='updated',
                    entity_type='task',
                    entity_id=task.id,
                    description=f'Updated task "{task.title}": {", ".join(desc_parts)}'
                )
                if updated_task.assigned_to and updated_task.assigned_to != request.user:
                    create_notification(
                        user=updated_task.assigned_to,
                        title='Task Completed' if updated_task.status == 'done' else 'Task Updated',
                        message=f'Task "{task.title}" has been updated.',
                        notification_type='task_completed' if updated_task.status == 'done' else 'task_updated',
                    )
            if updated_task.assigned_to and updated_task.assigned_to != old_assignee and updated_task.assigned_to != request.user:
                create_notification(
                    user=updated_task.assigned_to,
                    title='Task Assigned to You',
                    message=f'Task "{task.title}" has been assigned to you.',
                    notification_type='task_assigned',
                )
            return Response(TaskSerializer(updated_task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if not TeamMember.objects.filter(team=task.project.team, user=request.user, role__in=['admin', 'manager']).exists():
            return Response({'detail': 'Only team admins and managers can delete tasks.'}, status=status.HTTP_403_FORBIDDEN)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def activity_log(request):
    project_id = request.query_params.get('project')
    task_id = request.query_params.get('task')
    user_team_ids = TeamMember.objects.filter(user=request.user).values_list('team_id', flat=True)
    user_project_ids = Project.objects.filter(team_id__in=user_team_ids).values_list('id', flat=True)
    user_task_ids = Task.objects.filter(project_id__in=user_project_ids).values_list('id', flat=True)
    logs = ActivityLog.objects.select_related('user__profile').filter(
        Q(entity_type='project', entity_id__in=user_project_ids)
        | Q(entity_type='task', entity_id__in=user_task_ids)
    )
    if project_id:
        project_task_ids = Task.objects.filter(project_id=project_id).values_list('id', flat=True)
        logs = logs.filter(Q(entity_type='project', entity_id=project_id) | Q(entity_type='task', entity_id__in=project_task_ids))
    if task_id:
        logs = logs.filter(entity_type='task', entity_id=task_id)
    logs = logs[:50]
    serializer = ActivityLogSerializer(logs, many=True)
    return Response(serializer.data)
