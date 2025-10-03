# backend/apps/workflows/tests/test_models.py
"""
Unit tests for configurable workflow models
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.workflows.models import (
    WorkflowTemplate, WorkflowState, WorkflowStateStep,
    WorkflowTransition, Workflow
)

User = get_user_model()


class WorkflowTemplateModelTest(TestCase):
    """Test WorkflowTemplate model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )

    def test_create_template(self):
        """Test creating a workflow template"""
        template = WorkflowTemplate.objects.create(
            code='TEST_WORKFLOW',
            name='Test Workflow',
            name_fa='گردش کار تست',
            description='Test workflow description',
            is_active=True,
            created_by=self.user
        )

        self.assertEqual(template.code, 'TEST_WORKFLOW')
        self.assertEqual(template.name, 'Test Workflow')
        self.assertTrue(template.is_active)
        self.assertEqual(str(template), 'TEST_WORKFLOW - Test Workflow')

    def test_template_unique_code(self):
        """Test template code must be unique"""
        WorkflowTemplate.objects.create(
            code='UNIQUE_CODE',
            name='First',
            name_fa='اول',
            created_by=self.user
        )

        # Second template with same code should fail
        with self.assertRaises(Exception):
            WorkflowTemplate.objects.create(
                code='UNIQUE_CODE',
                name='Second',
                name_fa='دوم',
                created_by=self.user
            )


class WorkflowStateModelTest(TestCase):
    """Test WorkflowState model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            created_by=self.user
        )

    def test_create_state(self):
        """Test creating a workflow state"""
        state = WorkflowState.objects.create(
            template=self.template,
            code='INITIAL',
            name='Initial State',
            name_fa='وضعیت اولیه',
            state_type='FORM',
            order=1,
            is_initial=True
        )

        self.assertEqual(state.code, 'INITIAL')
        self.assertEqual(state.state_type, 'FORM')
        self.assertTrue(state.is_initial)
        self.assertEqual(state.order, 1)

    def test_state_ordering(self):
        """Test states are ordered by order field"""
        state1 = WorkflowState.objects.create(
            template=self.template,
            code='STATE1',
            name='State 1',
            name_fa='وضعیت ۱',
            order=2
        )
        state2 = WorkflowState.objects.create(
            template=self.template,
            code='STATE2',
            name='State 2',
            name_fa='وضعیت ۲',
            order=1
        )

        states = list(WorkflowState.objects.filter(template=self.template))
        self.assertEqual(states[0].code, 'STATE2')  # order=1 comes first
        self.assertEqual(states[1].code, 'STATE1')  # order=2 comes second

    def test_get_required_steps_count(self):
        """Test counting required steps"""
        state = WorkflowState.objects.create(
            template=self.template,
            code='APPROVAL',
            name='Approval State',
            name_fa='وضعیت تایید',
            state_type='APPROVAL',
            order=1
        )

        # Add 3 steps
        for i in range(3):
            WorkflowStateStep.objects.create(
                state=state,
                step_number=i,
                name=f'Step {i}',
                name_fa=f'مرحله {i}'
            )

        self.assertEqual(state.get_required_steps_count(), 3)


class WorkflowStateStepModelTest(TestCase):
    """Test WorkflowStateStep model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            created_by=self.user
        )
        self.state = WorkflowState.objects.create(
            template=self.template,
            code='APPROVAL',
            name='Approval',
            name_fa='تایید',
            state_type='APPROVAL',
            order=1
        )

    def test_create_step(self):
        """Test creating a workflow step"""
        step = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=0,
            name='Manager Approval',
            name_fa='تایید مدیر',
            required_role_code='MANAGER',
            requires_signature=True
        )

        self.assertEqual(step.step_number, 0)
        self.assertEqual(step.required_role_code, 'MANAGER')
        self.assertTrue(step.requires_signature)

    def test_step_with_form(self):
        """Test step with attached form"""
        step = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=0,
            name='Form Step',
            name_fa='مرحله فرم',
            form_number=1,
            required_role_code='EXPERT'
        )

        self.assertEqual(step.form_number, 1)
        self.assertEqual(step.required_role_code, 'EXPERT')

    def test_step_ordering(self):
        """Test steps are ordered by step_number"""
        step2 = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=2,
            name='Step 2',
            name_fa='مرحله ۲'
        )
        step0 = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=0,
            name='Step 0',
            name_fa='مرحله ۰'
        )
        step1 = WorkflowStateStep.objects.create(
            state=self.state,
            step_number=1,
            name='Step 1',
            name_fa='مرحله ۱'
        )

        steps = list(self.state.steps.all())
        self.assertEqual(steps[0].step_number, 0)
        self.assertEqual(steps[1].step_number, 1)
        self.assertEqual(steps[2].step_number, 2)


class WorkflowTransitionModelTest(TestCase):
    """Test WorkflowTransition model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            created_by=self.user
        )
        self.state1 = WorkflowState.objects.create(
            template=self.template,
            code='STATE1',
            name='State 1',
            name_fa='وضعیت ۱',
            order=1
        )
        self.state2 = WorkflowState.objects.create(
            template=self.template,
            code='STATE2',
            name='State 2',
            name_fa='وضعیت ۲',
            order=2
        )

    def test_create_transition(self):
        """Test creating a transition"""
        transition = WorkflowTransition.objects.create(
            template=self.template,
            name='State 1 to State 2',
            name_fa='وضعیت ۱ به وضعیت ۲',
            from_state=self.state1,
            to_state=self.state2,
            condition_type='ALWAYS',
            is_automatic=True,
            order=1
        )

        self.assertEqual(transition.from_state, self.state1)
        self.assertEqual(transition.to_state, self.state2)
        self.assertEqual(transition.condition_type, 'ALWAYS')
        self.assertTrue(transition.is_automatic)

    def test_transition_condition_always(self):
        """Test ALWAYS condition always passes"""
        transition = WorkflowTransition.objects.create(
            template=self.template,
            from_state=self.state1,
            to_state=self.state2,
            condition_type='ALWAYS'
        )

        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.state1
        )

        self.assertTrue(transition.check_condition(workflow))

    def test_transition_condition_all_steps_approved(self):
        """Test ALL_STEPS_APPROVED condition"""
        # Add steps to state1
        WorkflowStateStep.objects.create(
            state=self.state1,
            step_number=0,
            name='Step 0',
            name_fa='مرحله ۰'
        )
        WorkflowStateStep.objects.create(
            state=self.state1,
            step_number=1,
            name='Step 1',
            name_fa='مرحله ۱'
        )

        transition = WorkflowTransition.objects.create(
            template=self.template,
            from_state=self.state1,
            to_state=self.state2,
            condition_type='ALL_STEPS_APPROVED'
        )

        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.state1,
            current_step=0
        )

        # Not all steps approved yet
        self.assertFalse(transition.check_condition(workflow))

        # Mark all steps as approved
        state_id = str(self.state1.id)
        workflow.completed_steps = {
            state_id: {
                '0': {'by': str(self.user.id), 'at': '2025-10-02'},
                '1': {'by': str(self.user.id), 'at': '2025-10-02'}
            }
        }
        workflow.save()

        # Now condition should pass
        self.assertTrue(transition.check_condition(workflow))


class WorkflowModelTest(TestCase):
    """Test Workflow model with configurable system"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            created_by=self.user,
            is_active=True
        )
        self.initial_state = WorkflowState.objects.create(
            template=self.template,
            code='INITIAL',
            name='Initial',
            name_fa='اولیه',
            order=1,
            is_initial=True
        )
        self.final_state = WorkflowState.objects.create(
            template=self.template,
            code='FINAL',
            name='Final',
            name_fa='نهایی',
            order=2,
            is_terminal=True
        )

    def test_create_configurable_workflow(self):
        """Test creating a configurable workflow"""
        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.initial_state
        )

        self.assertTrue(workflow.is_configurable())
        self.assertEqual(workflow.current_state, self.initial_state)
        self.assertEqual(workflow.current_step, 0)

    def test_workflow_step_completion(self):
        """Test marking steps as completed"""
        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.initial_state
        )

        # Add a step to initial state
        step = WorkflowStateStep.objects.create(
            state=self.initial_state,
            step_number=0,
            name='Approval',
            name_fa='تایید'
        )

        # Mark step as completed
        state_id = str(self.initial_state.id)
        workflow.completed_steps = {
            state_id: {
                '0': {
                    'by': str(self.user.id),
                    'by_username': self.user.username,
                    'role_code': 'MANAGER',
                    'at': '2025-10-02T10:00:00'
                }
            }
        }
        workflow.save()

        # Check step is completed
        self.assertTrue(workflow.are_all_steps_approved())

    def test_perform_transition(self):
        """Test performing a transition"""
        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.initial_state
        )

        # Create transition
        transition = WorkflowTransition.objects.create(
            template=self.template,
            from_state=self.initial_state,
            to_state=self.final_state,
            condition_type='ALWAYS',
            is_automatic=True
        )

        # Perform transition
        result = workflow.perform_configurable_transition(transition, by=self.user)

        self.assertTrue(result)
        workflow.refresh_from_db()
        self.assertEqual(workflow.current_state, self.final_state)
        self.assertEqual(workflow.current_step, 0)

    def test_get_available_transitions(self):
        """Test getting available transitions"""
        workflow = Workflow.objects.create(
            title='Test Workflow',
            created_by=self.user,
            template=self.template,
            current_state=self.initial_state
        )

        # Create transition that should be available
        WorkflowTransition.objects.create(
            template=self.template,
            from_state=self.initial_state,
            to_state=self.final_state,
            condition_type='ALWAYS'
        )

        transitions = workflow.get_available_transitions(self.user)
        self.assertEqual(len(transitions), 1)
        self.assertEqual(transitions[0].to_state, self.final_state)
