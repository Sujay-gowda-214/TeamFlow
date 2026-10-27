from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from apps.comments.models import Comment
from apps.tasks.models import Task
from apps.teams.models import TeamMember
from apps.users.models import UserProfile


class TeamFlowApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username='owner', email='owner@example.test', password='Strong-pass-123',
            first_name='Team', last_name='Owner',
        )
        UserProfile.objects.create(user=self.owner, role='admin')
        self.member = User.objects.create_user(
            username='member', email='member@example.test', password='Strong-pass-123',
            first_name='Team', last_name='Member',
        )
        UserProfile.objects.create(user=self.member)
        self.outsider = User.objects.create_user(
            username='outsider', email='outsider@example.test', password='Strong-pass-123',
        )
        self.client.force_authenticate(self.owner)

    def create_team_and_project(self):
        team_response = self.client.post(
            '/api/teams/', {'name': 'Product Team', 'description': 'Delivery team'}, format='json',
        )
        self.assertEqual(team_response.status_code, 201, team_response.data)
        team_id = team_response.data['id']

        member_response = self.client.post(
            f'/api/teams/{team_id}/members/',
            {'user_id': self.member.id, 'role': 'member'}, format='json',
        )
        self.assertEqual(member_response.status_code, 201, member_response.data)

        project_response = self.client.post(
            '/api/projects/',
            {'name': 'Launch', 'description': 'First release', 'team': team_id, 'status': 'active', 'priority': 'high'},
            format='json',
        )
        self.assertEqual(project_response.status_code, 201, project_response.data)
        return team_id, project_response.data['id']

    def test_registration_creates_member_profile_and_supports_username_and_email_login(self):
        registration = self.client.post('/api/auth/register/', {
            'username': 'new-user',
            'email': 'New.User@Example.test',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'Strong-pass-123',
            'password2': 'Strong-pass-123',
            'role': 'admin',
        }, format='json')
        self.assertEqual(registration.status_code, 201, registration.data)
        registered_user = User.objects.get(username='new-user')
        self.assertEqual(registered_user.profile.role, 'member')
        self.assertIn('access', registration.data['tokens'])
        duplicate_email = self.client.post('/api/auth/register/', {
            'username': 'another-user',
            'email': 'new.user@example.test',
            'first_name': 'Another',
            'last_name': 'User',
            'password': 'Strong-pass-123',
            'password2': 'Strong-pass-123',
        }, format='json')
        self.assertEqual(duplicate_email.status_code, 400)

        for identifier in ('new-user', 'new.user@example.test'):
            response = self.client.post(
                '/api/auth/login/',
                {'username': identifier, 'password': 'Strong-pass-123'},
                format='json',
            )
            self.assertEqual(response.status_code, 200, response.data)
            self.assertIn('refresh', response.data['tokens'])
            refresh_response = self.client.post(
                '/api/auth/refresh/',
                {'refresh': response.data['tokens']['refresh']},
                format='json',
            )
            self.assertEqual(refresh_response.status_code, 200, refresh_response.data)
            self.assertIn('access', refresh_response.data)

        missing_credentials = self.client.post('/api/auth/login/', {}, format='json')
        self.assertEqual(missing_credentials.status_code, 400)

    def test_team_project_task_comment_and_dashboard_workflow(self):
        team_id, project_id = self.create_team_and_project()

        task_response = self.client.post('/api/tasks/', {
            'title': 'Prepare release',
            'project': project_id,
            'assigned_to': self.member.id,
            'priority': 'high',
            'status': 'todo',
            'estimated_hours': 4,
        }, format='json')
        self.assertEqual(task_response.status_code, 201, task_response.data)
        task_id = task_response.data['id']

        task_list = self.client.get('/api/tasks/', {'project': project_id})
        self.assertEqual(task_list.status_code, 200)
        self.assertEqual([task['id'] for task in task_list.data], [task_id])

        comment_response = self.client.post(
            f'/api/comments/task/{task_id}/', {'text': 'Please review the release checklist.'}, format='json',
        )
        self.assertEqual(comment_response.status_code, 201, comment_response.data)
        self.assertEqual(Comment.objects.count(), 1)

        status_response = self.client.put(
            f'/api/tasks/{task_id}/', {'status': 'in_progress', 'actual_hours': 1.5}, format='json',
        )
        self.assertEqual(status_response.status_code, 200, status_response.data)
        self.assertEqual(float(status_response.data['actual_hours']), 1.5)

        activity_response = self.client.get('/api/tasks/activity/', {'project': project_id})
        self.assertEqual(activity_response.status_code, 200)
        self.assertTrue(any(item['entity_type'] == 'task' for item in activity_response.data))

        project_detail = self.client.get(f'/api/projects/{project_id}/')
        self.assertEqual(project_detail.status_code, 200)
        self.assertEqual(project_detail.data['task_count'], 1)

        dashboard = self.client.get('/api/projects/dashboard/stats/')
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data['total_projects'], 1)

        self.client.force_authenticate(self.member)
        notifications = self.client.get('/api/notifications/')
        self.assertEqual(notifications.status_code, 200)
        self.assertTrue(any(item['notification_type'] == 'task_assigned' for item in notifications.data['notifications']))

        self.client.force_authenticate(self.owner)
        team_detail = self.client.get(f'/api/teams/{team_id}/')
        self.assertEqual(team_detail.status_code, 200)

    def test_team_boundaries_and_role_checks(self):
        team_id, project_id = self.create_team_and_project()
        task = Task.objects.create(
            title='Internal task',
            project_id=project_id,
            created_by=self.owner,
        )

        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get(f'/api/projects/{project_id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/tasks/{task.id}/').status_code, 404)
        self.assertEqual(self.client.get(f'/api/comments/task/{task.id}/').status_code, 404)
        self.assertEqual(
            self.client.post(f'/api/teams/{team_id}/members/', {'user_id': self.outsider.id}, format='json').status_code,
            403,
        )

        self.client.force_authenticate(self.member)
        self.assertEqual(
            self.client.put(f'/api/teams/{team_id}/', {'name': 'Changed'}, format='json').status_code,
            403,
        )

        self.client.force_authenticate(self.owner)
        invalid_assignment = self.client.post('/api/tasks/', {
            'title': 'Invalid assignment',
            'project': project_id,
            'assigned_to': self.outsider.id,
        }, format='json')
        self.assertEqual(invalid_assignment.status_code, 400, invalid_assignment.data)

    def test_password_change_rejects_missing_fields_without_server_error(self):
        response = self.client.post('/api/auth/me/change-password/', {}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_profile_update_and_password_change_validate_inputs(self):
        profile_response = self.client.patch('/api/auth/me/update/', {
            'first_name': 'Updated',
            'email': 'updated@example.test',
            'department': 'Engineering',
        }, format='json')
        self.assertEqual(profile_response.status_code, 200, profile_response.data)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.first_name, 'Updated')
        self.assertEqual(self.owner.email, 'updated@example.test')
        self.assertEqual(self.owner.profile.department, 'Engineering')

        invalid_email = self.client.patch('/api/auth/me/update/', {
            'email': self.member.email,
        }, format='json')
        self.assertEqual(invalid_email.status_code, 400)

        invalid_password = self.client.post('/api/auth/me/change-password/', {
            'old_password': 'Strong-pass-123',
            'new_password': 'short',
        }, format='json')
        self.assertEqual(invalid_password.status_code, 400)

        changed_password = self.client.post('/api/auth/me/change-password/', {
            'old_password': 'Strong-pass-123',
            'new_password': 'New-strong-pass-123',
        }, format='json')
        self.assertEqual(changed_password.status_code, 200, changed_password.data)
        self.assertTrue(User.objects.get(pk=self.owner.pk).check_password('New-strong-pass-123'))

    def test_project_date_and_task_hours_validation(self):
        team_id, project_id = self.create_team_and_project()
        invalid_project = self.client.post('/api/projects/', {
            'name': 'Invalid timeline',
            'team': team_id,
            'start_date': '2026-12-31',
            'end_date': '2026-01-01',
        }, format='json')
        self.assertEqual(invalid_project.status_code, 400)

        invalid_task = self.client.post('/api/tasks/', {
            'title': 'Negative estimate',
            'project': project_id,
            'estimated_hours': -1,
        }, format='json')
        self.assertEqual(invalid_task.status_code, 400)

    def test_last_team_admin_cannot_be_removed(self):
        team_response = self.client.post('/api/teams/', {'name': 'Admin Team'}, format='json')
        self.assertEqual(team_response.status_code, 201, team_response.data)
        team_id = team_response.data['id']
        response = self.client.delete(f'/api/teams/{team_id}/members/{self.owner.id}/')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertTrue(TeamMember.objects.filter(team_id=team_id, user=self.owner).exists())
