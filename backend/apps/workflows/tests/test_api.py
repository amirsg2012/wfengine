# backend/apps/workflows/tests/test_api.py
"""
API endpoint tests for configurable workflow system
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.workflows.models import (
    WorkflowTemplate, WorkflowState, WorkflowStateStep,
    WorkflowTransition, Workflow
)
from apps.accounts.models import OrgRole, OrgRoleGroup, Membership
from apps.permissions.models import StatePermission, PermissionType

User = get_user_model()


class WorkflowTemplateAPITest(TestCase):
    """Test WorkflowTemplate API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test Workflow',
            name_fa='گردش کار تست',
            is_active=True,
            created_by=self.user
        )

    def test_list_templates(self):
        """Test listing active workflow templates"""
        response = self.client.get('/api/workflow-templates/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], 'TEST')

    def test_list_templates_only_active(self):
        """Test only active templates are returned"""
        # Create inactive template
        WorkflowTemplate.objects.create(
            code='INACTIVE',
            name='Inactive',
            name_fa='غیرفعال',
            is_active=False,
            created_by=self.user
        )

        response = self.client.get('/api/workflow-templates/')

        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['code'], 'TEST')

    def test_template_detail(self):
        """Test getting template detail"""
        response = self.client.get(f'/api/workflow-templates/{self.template.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['code'], 'TEST')
        self.assertEqual(response.data['name'], 'Test Workflow')


class WorkflowCreationAPITest(TestCase):
    """Test workflow creation with auto-template assignment"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create template with initial state
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            is_active=True,
            created_by=self.user
        )
        self.initial_state = WorkflowState.objects.create(
            template=self.template,
            code='INITIAL',
            name='Initial',
            name_fa='اولیه',
            order=1,
            is_initial=True
        )

    def test_create_workflow_auto_assigns_template(self):
        """Test workflow creation auto-assigns template"""
        data = {
            'title': 'Test Workflow',
            'applicant_name': 'John Doe',
            'applicant_national_id': '1234567890'
        }

        response = self.client.post('/api/workflows/', data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify workflow has template and initial state
        workflow = Workflow.objects.get(pk=response.data['id'])
        self.assertEqual(workflow.template, self.template)
        self.assertEqual(workflow.current_state, self.initial_state)
        self.assertTrue(workflow.is_configurable())


class WorkflowTransitionAPITest(TestCase):
    """Test workflow transition API endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create template and states
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            is_active=True,
            created_by=self.user
        )
        self.state1 = WorkflowState.objects.create(
            template=self.template,
            code='STATE1',
            name='State 1',
            name_fa='وضعیت ۱',
            order=1,
            is_initial=True
        )
        self.state2 = WorkflowState.objects.create(
            template=self.template,
            code='STATE2',
            name='State 2',
            name_fa='وضعیت ۲',
            order=2
        )

        # Create transition
        self.transition = WorkflowTransition.objects.create(
            template=self.template,
            from_state=self.state1,
            to_state=self.state2,
            condition_type='ALWAYS',
            is_automatic=True
        )

        # Create workflow
        self.workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.state1
        )

    def test_get_available_transitions(self):
        """Test getting available transitions"""
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/available-transitions/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['transitions']), 1)
        self.assertEqual(
            response.data['transitions'][0]['to_state']['code'],
            'STATE2'
        )

    def test_perform_transition(self):
        """Test performing a transition"""
        data = {'transition_id': str(self.transition.id)}

        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/perform-transition/',
            data
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])

        # Verify workflow transitioned
        self.workflow.refresh_from_db()
        self.assertEqual(self.workflow.current_state, self.state2)

    def test_get_workflow_info(self):
        """Test getting detailed workflow info"""
        response = self.client.get(
            f'/api/workflows/{self.workflow.id}/workflow-info/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_configurable'])
        self.assertEqual(
            response.data['configurable']['template']['code'],
            'TEST'
        )
        self.assertEqual(
            response.data['configurable']['current_state']['code'],
            'STATE1'
        )


class WorkflowApprovalAPITest(TestCase):
    """Test workflow approval with steps"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

        # Create role and assign to user
        group = OrgRoleGroup.objects.create(
            code='TEST_GROUP',
            name_fa='گروه تست'
        )
        self.role = OrgRole.objects.create(
            code='MANAGER',
            name_fa='مدیر',
            group=group
        )
        Membership.objects.create(user=self.user, role=self.role)

        self.client.force_authenticate(user=self.user)

        # Create template and state with steps
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            is_active=True,
            created_by=self.user
        )
        self.state = WorkflowState.objects.create(
            template=self.template,
            code='APPROVAL',
            name='Approval',
            name_fa='تایید',
            state_type='APPROVAL',
            order=1,
            is_initial=True
        )

        # Add step
        self.step = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=0,
            name='Manager Approval',
            name_fa='تایید مدیر',
            required_role_code='MANAGER'
        )

        # Create workflow
        self.workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.state
        )

        # Grant approve permission
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.APPROVE,
            role=self.role,
            is_active=True
        )

    def test_approve_step(self):
        """Test approving a workflow step"""
        response = self.client.post(
            f'/api/workflows/{self.workflow.id}/approve/'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify step is marked as completed
        self.workflow.refresh_from_db()
        state_id = str(self.state.id)
        self.assertIn(state_id, self.workflow.completed_steps)
        self.assertIn('0', self.workflow.completed_steps[state_id])
