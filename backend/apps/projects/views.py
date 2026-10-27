from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Project
from .serializers import ProjectSerializer, ProjectCreateSerializer
from apps.teams.models import TeamMember
from apps.tasks.models import ActivityLog

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projects_list(request):
    if request.method == 'GET':
        user_team_ids = TeamMember.objects.filter(user=request.user).values_list('team_id', flat=True)
        projects = Project.objects.filter(team_id__in=user_team_ids).select_related('created_by__profile', 'team').prefetch_related('members__profile')
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

    serializer = ProjectCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        project = serializer.save(created_by=request.user)
        project.members.add(request.user)
        ActivityLog.objects.create(
            user=request.user,
            action='created',
            entity_type='project',
            entity_id=project.id,
            description=f'Created project "{project.name}"'
        )
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def project_detail(request, pk):
    try:
        project = Project.objects.select_related('team').get(pk=pk, team__members__user=request.user)
    except Project.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ProjectSerializer(project).data)

    if request.method == 'PUT':
        if not TeamMember.objects.filter(team=project.team, user=request.user, role__in=['admin', 'manager']).exists():
            return Response({'detail': 'Only team admins and managers can update projects.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectCreateSerializer(project, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            ActivityLog.objects.create(
                user=request.user,
                action='updated',
                entity_type='project',
                entity_id=project.id,
                description=f'Updated project "{project.name}"'
            )
            return Response(ProjectSerializer(project).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if not TeamMember.objects.filter(team=project.team, user=request.user, role__in=['admin', 'manager']).exists():
            return Response({'detail': 'Only team admins and managers can delete projects.'}, status=status.HTTP_403_FORBIDDEN)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_project_member(request, pk):
    try:
        project = Project.objects.get(pk=pk)
    except Project.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not TeamMember.objects.filter(team=project.team, user=request.user, role__in=['admin', 'manager']).exists():
        return Response({'detail': 'Only team admins and managers can manage project members.'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not TeamMember.objects.filter(team=project.team, user=user).exists():
        return Response({'detail': 'Project members must belong to the project team.'}, status=status.HTTP_400_BAD_REQUEST)

    project.members.add(user)
    return Response({'detail': 'Member added.'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    from django.utils import timezone
    from apps.tasks.models import Task

    user = request.user
    user_team_ids = TeamMember.objects.filter(user=user).values_list('team_id', flat=True)
    projects = Project.objects.filter(team_id__in=user_team_ids)
    my_tasks = Task.objects.filter(assigned_to=user, project__team_id__in=user_team_ids)
    now = timezone.now()

    return Response({
        'total_projects': projects.count(),
        'active_projects': projects.filter(status='active').count(),
        'completed_projects': projects.filter(status='completed').count(),
        'my_tasks': my_tasks.count(),
        'tasks_todo': my_tasks.filter(status='todo').count(),
        'tasks_in_progress': my_tasks.filter(status='in_progress').count(),
        'tasks_done': my_tasks.filter(status='done').count(),
        'overdue_tasks': my_tasks.filter(status__in=['todo', 'in_progress'], deadline__lt=now).count(),
        'recent_projects': ProjectSerializer(projects.order_by('-created_at')[:5], many=True).data,
    })
