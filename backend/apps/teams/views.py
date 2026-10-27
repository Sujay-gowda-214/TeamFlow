from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db import transaction
from .models import Team, TeamMember
from .serializers import TeamSerializer, TeamCreateSerializer, TeamMemberSerializer
from apps.notifications.utils import create_notification

def user_team_ids(user):
    return TeamMember.objects.filter(user=user).values_list('team_id', flat=True)

def can_manage_team(team, user):
    return TeamMember.objects.filter(team=team, user=user, role__in=['admin', 'manager']).exists()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teams_list(request):
    if request.method == 'GET':
        teams = Team.objects.filter(id__in=user_team_ids(request.user)).prefetch_related('members__user__profile').select_related('created_by__profile')
        serializer = TeamSerializer(teams, many=True)
        return Response(serializer.data)

    serializer = TeamCreateSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            team = serializer.save(created_by=request.user)
            TeamMember.objects.create(team=team, user=request.user, role='admin')
        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def team_detail(request, pk):
    try:
        team = Team.objects.get(pk=pk)
        TeamMember.objects.get(team=team, user=request.user)
    except (Team.DoesNotExist, TeamMember.DoesNotExist):
        return Response({'detail': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TeamSerializer(team).data)

    if request.method == 'PUT':
        if not can_manage_team(team, request.user):
            return Response({'detail': 'Only team admins and managers can update the team.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamCreateSerializer(team, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TeamSerializer(team).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'DELETE':
        if not can_manage_team(team, request.user):
            return Response({'detail': 'Only team admins and managers can delete the team.'}, status=status.HTTP_403_FORBIDDEN)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_member(request, pk):
    try:
        team = Team.objects.get(pk=pk)
    except Team.DoesNotExist:
        return Response({'detail': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not can_manage_team(team, request.user):
        return Response({'detail': 'Only team admins and managers can manage members.'}, status=status.HTTP_403_FORBIDDEN)

    user_id = request.data.get('user_id')
    role = request.data.get('role', 'member')
    if role not in {'admin', 'manager', 'member'}:
        return Response({'role': ['Select a valid role.']}, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

    member, created = TeamMember.objects.get_or_create(team=team, user=user, defaults={'role': role})
    if not created:
        return Response({'detail': 'User is already a member.'}, status=status.HTTP_400_BAD_REQUEST)

    create_notification(
        user=user,
        title='Added to Team',
        message=f'You have been added to team "{team.name}" by {request.user.get_full_name() or request.user.username}.',
        notification_type='team_added',
    )
    return Response(TeamMemberSerializer(member).data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_member(request, pk, user_id):
    try:
        team = Team.objects.get(pk=pk)
        member = TeamMember.objects.get(team=team, user_id=user_id)
    except (Team.DoesNotExist, TeamMember.DoesNotExist):
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if not can_manage_team(team, request.user):
        return Response({'detail': 'Only team admins and managers can manage members.'}, status=status.HTTP_403_FORBIDDEN)
    if member.role == 'admin' and team.members.filter(role='admin').count() == 1:
        return Response({'detail': 'A team must have at least one admin.'}, status=status.HTTP_400_BAD_REQUEST)
    member.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
