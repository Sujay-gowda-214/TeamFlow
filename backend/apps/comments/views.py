from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Comment
from .serializers import CommentSerializer, CommentCreateSerializer
from apps.tasks.models import Task, ActivityLog
from apps.notifications.utils import create_notification

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def task_comments(request, task_id):
    try:
        task = Task.objects.get(pk=task_id, project__team__members__user=request.user)
    except Task.DoesNotExist:
        return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        comments = Comment.objects.filter(task=task).select_related('user__profile')
        return Response(CommentSerializer(comments, many=True).data)

    serializer = CommentCreateSerializer(data=request.data)
    if serializer.is_valid():
        comment = serializer.save(task=task, user=request.user)
        ActivityLog.objects.create(
            user=request.user,
            action='commented',
            entity_type='task',
            entity_id=task.id,
            description=f'Added a comment on "{task.title}"'
        )
        if task.assigned_to and task.assigned_to != request.user:
            create_notification(
                user=task.assigned_to,
                title='New Comment on Your Task',
                message=f'{request.user.get_full_name() or request.user.username} commented on task "{task.title}".',
                notification_type='comment_added',
            )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def comment_detail(request, pk):
    try:
        comment = Comment.objects.get(pk=pk, user=request.user, task__project__team__members__user=request.user)
    except Comment.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PUT':
        serializer = CommentCreateSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(CommentSerializer(comment).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
