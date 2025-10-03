# apps/workflows/models.py
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition, ConcurrentTransitionMixin
from storages.backends.s3boto3 import S3Boto3Storage
from typing import Dict, Any, Optional, List
from django_mongodb_backend.fields import ObjectIdAutoField


from .workflow_spec import NEXT_STATE
from . import actions as act
import json
from datetime import datetime

User = get_user_model()


# ==================== Configurable Workflow System Models ====================

class WorkflowTemplate(models.Model):
    """
    Defines a workflow type/template (e.g., 'Property Acquisition', 'Loan Processing')
    Enables creating multiple workflow types without code changes.
    """
    id = ObjectIdAutoField(primary_key=True)
    code = models.CharField(max_length=64, unique=True, help_text="Unique code (e.g., 'PROPERTY_ACQUISITION')")
    name = models.CharField(max_length=255, help_text="Template name in English")
    name_fa = models.CharField(max_length=255, help_text="Template name in Persian")
    description = models.TextField(blank=True, help_text="Template description")
    is_active = models.BooleanField(default=True, help_text="Is this template active?")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Workflow Template"
        verbose_name_plural = "Workflow Templates"
        db_table = 'workflows_workflow_template'

    def __str__(self):
        return f"{self.name_fa} ({self.code})"

    def get_initial_state(self):
        """Get the initial state for this template"""
        return self.states.filter(is_initial=True).first()

    def get_terminal_states(self):
        """Get all terminal states for this template"""
        return self.states.filter(is_terminal=True)


class StateType(models.TextChoices):
    """Type of state in workflow"""
    FORM = 'FORM', 'Form State'  # Requires form submission
    APPROVAL = 'APPROVAL', 'Approval State'  # Only needs approval
    REVIEW = 'REVIEW', 'Review State'  # Review/read-only
    AUTOMATIC = 'AUTOMATIC', 'Automatic State'  # Auto-transition based on conditions


class WorkflowState(models.Model):
    """
    Defines a single state within a workflow template.
    States can be forms, approval stages, or automatic transitions.
    """
    id = ObjectIdAutoField(primary_key=True)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='states',
        help_text="Workflow template this state belongs to"
    )

    # State definition
    code = models.CharField(max_length=64, help_text="State code (e.g., 'APPLICANT_REQUEST')")
    name = models.CharField(max_length=255, help_text="State name in English")
    name_fa = models.CharField(max_length=255, help_text="State name in Persian")
    description = models.TextField(blank=True, help_text="State description")

    # State properties
    state_type = models.CharField(
        max_length=32,
        choices=StateType.choices,
        default=StateType.APPROVAL,
        help_text="Type of state (form/approval/review/automatic)"
    )
    form_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="If state_type=FORM, which form number to use?"
    )
    form_schema = models.JSONField(
        null=True,
        blank=True,
        help_text="JSON schema for the form (for future dynamic forms)"
    )

    # Ordering and flow
    order = models.IntegerField(default=0, help_text="Display order")
    is_initial = models.BooleanField(default=False, help_text="Is this the starting state?")
    is_terminal = models.BooleanField(default=False, help_text="Is this an ending state?")

    # Behavior
    allow_edit = models.BooleanField(default=True, help_text="Can data be edited in this state?")
    allow_back = models.BooleanField(default=False, help_text="Can go back to previous state?")
    require_all_steps = models.BooleanField(
        default=True,
        help_text="All approval steps required? (vs any step)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('template', 'code')]
        ordering = ['order']
        verbose_name = "Workflow State"
        verbose_name_plural = "Workflow States"
        db_table = 'workflows_workflow_state'
        indexes = [
            models.Index(fields=['template', 'order']),
            models.Index(fields=['template', 'is_initial']),
        ]

    def __str__(self):
        return f"{self.template.code}.{self.code} - {self.name_fa}"

    def get_required_steps_count(self):
        """Get number of required approval steps"""
        return self.steps.count()

    def get_next_states(self):
        """Get possible next states from transitions"""
        return WorkflowState.objects.filter(
            id__in=self.transitions_from.values_list('to_state_id', flat=True)
        )


class WorkflowStateStep(models.Model):
    """
    Defines approval steps within a state.
    Example: Step 1: Legal review, Step 2: Manager approval
    """
    id = ObjectIdAutoField(primary_key=True)
    state = models.ForeignKey(
        WorkflowState,
        on_delete=models.CASCADE,
        related_name='steps',
        help_text="State this step belongs to"
    )

    # Step definition
    step_number = models.IntegerField(help_text="Step index (0-based)")
    name = models.CharField(max_length=255, help_text="Step name in English")
    name_fa = models.CharField(max_length=255, help_text="Step name in Persian")
    description = models.TextField(blank=True, help_text="Step description")

    # Step behavior
    requires_signature = models.BooleanField(
        default=False,
        help_text="Does this step require a signature?"
    )
    signature_field_path = models.CharField(
        max_length=255,
        blank=True,
        help_text="JSON path to signature field (e.g., 'approvals.managerSignature')"
    )
    requires_comment = models.BooleanField(
        default=False,
        help_text="Does this step require a comment?"
    )

    # Form association
    form_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Form number for this step (if step requires form submission)"
    )
    form_schema = models.JSONField(
        null=True,
        blank=True,
        help_text="Custom form schema for this step (JSON Schema format)"
    )

    editable_fields = models.JSONField(
        default=list,
        blank=True,
        help_text="List of field paths this step can edit"
    )

    # Parallel vs Sequential
    parallel_group = models.IntegerField(
        null=True,
        blank=True,
        help_text="Steps with same group number can be done in parallel"
    )

    # Role requirement
    required_role_code = models.CharField(
        max_length=100,
        blank=True,
        help_text="Role code required to approve this step"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('state', 'step_number')]
        ordering = ['step_number']
        verbose_name = "Workflow State Step"
        verbose_name_plural = "Workflow State Steps"
        db_table = 'workflows_workflow_state_step'
        indexes = [
            models.Index(fields=['state', 'step_number']),
        ]

    def __str__(self):
        return f"{self.state.code} - Step {self.step_number + 1}: {self.name_fa}"


class TransitionConditionType(models.TextChoices):
    """Types of conditions for transitions"""
    ALWAYS = 'ALWAYS', 'Always Allowed'
    ALL_STEPS_APPROVED = 'ALL_STEPS_APPROVED', 'All Steps Approved'
    ANY_STEP_APPROVED = 'ANY_STEP_APPROVED', 'Any Step Approved'
    CUSTOM_LOGIC = 'CUSTOM_LOGIC', 'Custom Logic'
    FIELD_VALUE = 'FIELD_VALUE', 'Based on Field Value'


class WorkflowTransition(models.Model):
    """
    Defines possible state transitions with conditions.
    Enables dynamic workflow routing based on data or approval status.
    """
    id = ObjectIdAutoField(primary_key=True)
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='transitions',
        help_text="Workflow template this transition belongs to"
    )

    # Transition definition
    from_state = models.ForeignKey(
        WorkflowState,
        on_delete=models.CASCADE,
        related_name='transitions_from',
        help_text="Source state"
    )
    to_state = models.ForeignKey(
        WorkflowState,
        on_delete=models.CASCADE,
        related_name='transitions_to',
        help_text="Target state"
    )

    # Transition properties
    name = models.CharField(max_length=255, help_text="Transition name in English")
    name_fa = models.CharField(max_length=255, help_text="Transition name in Persian")
    is_automatic = models.BooleanField(
        default=False,
        help_text="Auto-transition when conditions met?"
    )

    # Conditions
    condition_type = models.CharField(
        max_length=32,
        choices=TransitionConditionType.choices,
        default=TransitionConditionType.ALL_STEPS_APPROVED,
        help_text="Type of condition to check"
    )
    condition_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional condition configuration (JSON)"
    )

    # Order (for manual transitions)
    order = models.IntegerField(default=0, help_text="Display order")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Workflow Transition"
        verbose_name_plural = "Workflow Transitions"
        db_table = 'workflows_workflow_transition'
        indexes = [
            models.Index(fields=['template', 'from_state']),
            models.Index(fields=['from_state', 'to_state']),
        ]

    def __str__(self):
        return f"{self.from_state.code} → {self.to_state.code}"

    def check_condition(self, workflow_instance) -> bool:
        """
        Check if transition condition is met for a workflow instance.
        Returns True if the workflow can transition.
        """
        if self.condition_type == TransitionConditionType.ALWAYS:
            return True

        elif self.condition_type == TransitionConditionType.ALL_STEPS_APPROVED:
            # Check if all steps in current state are approved
            required_steps = self.from_state.get_required_steps_count()
            if required_steps == 0:
                return True  # No steps required, can transition

            completed_steps = workflow_instance.completed_steps.get(str(self.from_state.id), {})
            return len(completed_steps) >= required_steps

        elif self.condition_type == TransitionConditionType.ANY_STEP_APPROVED:
            # At least one step approved
            completed_steps = workflow_instance.completed_steps.get(str(self.from_state.id), {})
            return len(completed_steps) > 0

        elif self.condition_type == TransitionConditionType.FIELD_VALUE:
            # Check specific field value
            field_path = self.condition_config.get('field_path')
            expected_value = self.condition_config.get('expected_value')
            if field_path and expected_value is not None:
                # Navigate nested dict to get field value
                value = workflow_instance.data
                for key in field_path.split('.'):
                    if isinstance(value, dict):
                        value = value.get(key)
                    else:
                        return False
                return value == expected_value

        elif self.condition_type == TransitionConditionType.CUSTOM_LOGIC:
            # TODO: Implement custom logic execution
            # Could use safe eval or predefined functions
            return True

        return False


# ==================== Legacy Workflow Model (Updated for Configurable System) ====================

class Workflow(ConcurrentTransitionMixin, models.Model):
    # Core identification fields
    title = models.CharField(max_length=300)
    body = models.TextField(blank=True, default="")

    # NEW: Configurable workflow system fields
    template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.PROTECT,
        related_name='instances',
        null=True,  # Allow null for backwards compatibility during migration
        blank=True,
        help_text="Workflow template (for configurable workflows)"
    )
    current_state = models.ForeignKey(
        WorkflowState,
        on_delete=models.PROTECT,
        related_name='workflow_instances',
        null=True,  # Allow null for backwards compatibility
        blank=True,
        help_text="Current state (for configurable workflows)"
    )
    current_step = models.IntegerField(
        default=0,
        help_text="Current step number within the state (0-based)"
    )
    completed_steps = models.JSONField(
        default=dict,
        blank=True,
        help_text="Completed steps per state {state_id: {step_num: {by, at, data}}}"
    )

    # LEGACY: FSM state (kept for backwards compatibility)
    class State(models.TextChoices):
        ApplicantRequest = "ApplicantRequest"
        CEOInstruction = "CEOInstruction"
        Form1 = "Form1"
        Form2 = "Form2"
        DocsCollection = "DocsCollection"
        Form3 = "Form3"
        Form4 = "Form4"
        AMLForm = "AMLForm"
        EvaluationCommittee = "EvaluationCommittee"
        AppraisalFeeDeposit = "AppraisalFeeDeposit"
        AppraisalNotice = "AppraisalNotice"
        AppraisalOpinion = "AppraisalOpinion"
        AppraisalDecision = "AppraisalDecision"
        Settlment = "Settlment"

    state = FSMField(default=State.ApplicantRequest, choices=State.choices, protected=True)

    # Flexible data storage for all form properties using TextField with JSON serialization
    _data = models.TextField(blank=True, default='{}', db_column='data')
    
    @property
    def data(self):
        """Get data as Python dict"""
        try:
            return json.loads(self._data) if self._data else {}
        except (json.JSONDecodeError, TypeError):
            return {}
    
    @data.setter
    def data(self, value):
        """Set data from Python dict"""
        self._data = json.dumps(value, ensure_ascii=False) if value else '{}'
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="workflows")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.state})"

    def save(self, *args, **kwargs):
        """Override save to auto-assign template and initial state for new workflows"""
        is_new = self.pk is None

        if is_new and not self.template:
            # Auto-assign default template
            default_template = WorkflowTemplate.objects.filter(
                code='PROPERTY_ACQUISITION',
                is_active=True
            ).first()

            if not default_template:
                default_template = WorkflowTemplate.objects.filter(is_active=True).first()

            if default_template:
                self.template = default_template

                # Set initial state
                if not self.current_state:
                    initial_state = WorkflowState.objects.filter(
                        template=default_template,
                        is_initial=True
                    ).first()
                    if initial_state:
                        self.current_state = initial_state
                        self.current_step = 0
                        self.completed_steps = {}

        # Save the workflow first
        super().save(*args, **kwargs)

        # Update legacy state field if we have a current_state
        if is_new and self.current_state:
            Workflow.objects.filter(pk=self.pk).update(state=self.current_state.code)

    # Property accessors for common fields
    @property
    def applicant_name(self):
        """Get full name from firstName and lastName"""
        first = self.data.get('personalInformation', {}).get('firstName', '')
        last = self.data.get('personalInformation', {}).get('lastName', '')
        if first and last:
            return f"{first} {last}"
        return first or last or self.data.get('applicantDetails', {}).get('name', '')

    @property
    def applicant_national_id(self):
        """Get national ID from various possible locations"""
        return (
            self.data.get('personalInformation', {}).get('nationalCode') or
            self.data.get('applicantDetails', {}).get('nationalCode') or
            ''
        )

    @property
    def property_address(self):
        """Get property address"""
        return (
            self.data.get('personalInformation', {}).get('residenceAddress') or
            self.data.get('propertyDetails', {}).get('address') or
            ''
        )

    @property
    def registration_plate_number(self):
        """Get property registration plate number"""
        return (
            self.data.get('propertyRegistrationPlateNumber') or
            self.data.get('propertyDetails', {}).get('registrationPlateNumber') or
            ''
        )

    def update_data(self, new_data, merge=True):
        """Update workflow data with proper merging"""
        current_data = self.data.copy()  # Get current data as dict
        
        if merge:
            self._deep_merge_data(current_data, new_data)
        else:
            current_data = new_data
            
        self.data = current_data  # Use the property setter
        self.save(update_fields=['_data', 'updated_at'])  # Save the actual field

    def _deep_merge_data(self, target, source):
        """Deep merge dictionaries"""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_merge_data(target[key], value)
            else:
                target[key] = value

    def get_form_data(self, form_number):
        """Get data formatted for a specific form"""
        from .forms.registry import FormRegistry
        form_class = FormRegistry.get_form(form_number)
        if form_class:
            return form_class.extract_from_workflow(self)
        return {}

    def update_from_form(self, form_number, form_data):
        """Update workflow data from form submission"""
        from .forms.registry import FormRegistry
        form_class = FormRegistry.get_form(form_number)
        if form_class:
            workflow_data = form_class.map_to_workflow(form_data)
            self.update_data(workflow_data)
    
    def can_advance_from_form3(self) -> bool:
        """Check if Form3 is completed and workflow can advance to next state"""
        if self.state != 'Form3':
            return False
        
        from .forms.form_3 import PropertyStatusReviewForm
        completion_status = PropertyStatusReviewForm.get_completion_status(self)
        return completion_status.get('is_fully_completed', False)

    def get_form3_progress_info(self) -> Dict[str, Any]:
        """Get detailed Form3 progress information"""
        if self.state != 'Form3':
            return {}
        
        from .forms.form_3 import PropertyStatusReviewForm
        from .actions import get_form3_step_info, get_form3_completion_status
        
        return {
            'current_step': get_form3_step_info(self),
            'completion_status': get_form3_completion_status(self),
            'can_advance': self.can_advance_from_form3()
        }
            
    def actions_ok(instance):
        from .actions import actions_ok as actions_ok_logic
        return actions_ok_logic(instance)
    # All workflow state transitions
    @transition(field=state, source=State.ApplicantRequest, target=State.CEOInstruction, conditions=[actions_ok])
    def to_CEOInstruction(self, by=None):
        pass

    @transition(field=state, source=State.CEOInstruction, target=State.Form1, conditions=[actions_ok])
    def to_Form1(self, by=None):
        pass

    @transition(field=state, source=State.Form1, target=State.Form2, conditions=[actions_ok])
    def to_Form2(self, by=None):
        pass

    @transition(field=state, source=State.Form2, target=State.DocsCollection, conditions=[actions_ok])
    def to_DocsCollection(self, by=None):
        pass

    @transition(field=state, source=State.DocsCollection, target=State.Form3, conditions=[actions_ok])
    def to_Form3(self, by=None):
        pass

    @transition(field=state, source=State.Form3, target=State.Form4, conditions=[actions_ok])
    def to_Form4(self, by=None):
        pass

    @transition(field=state, source=State.Form4, target=State.AMLForm, conditions=[actions_ok])
    def to_AMLForm(self, by=None):
        pass

    @transition(field=state, source=State.AMLForm, target=State.EvaluationCommittee, conditions=[actions_ok])
    def to_EvaluationCommittee(self, by=None):
        pass

    @transition(field=state, source=State.EvaluationCommittee, target=State.AppraisalFeeDeposit, conditions=[actions_ok])
    def to_AppraisalFeeDeposit(self, by=None):
        pass

    @transition(field=state, source=State.AppraisalFeeDeposit, target=State.AppraisalNotice, conditions=[actions_ok])
    def to_AppraisalNotice(self, by=None):
        pass

    @transition(field=state, source=State.AppraisalNotice, target=State.AppraisalOpinion, conditions=[actions_ok])
    def to_AppraisalOpinion(self, by=None):
        pass

    @transition(field=state, source=State.AppraisalOpinion, target=State.AppraisalDecision, conditions=[actions_ok])
    def to_AppraisalDecision(self, by=None):
        pass

    @transition(field=state, source=State.AppraisalDecision, target=State.Settlment, conditions=[actions_ok])
    def to_Settlment(self, by=None):
        pass

    # ==================== Configurable Workflow Methods ====================

    def is_configurable(self) -> bool:
        """Check if this workflow uses the configurable system"""
        return self.template is not None and self.current_state is not None

    def can_transition_to(self, user, target_state: WorkflowState) -> bool:
        """
        Check if user can transition workflow to target state.
        For configurable workflows only.
        """
        if not self.is_configurable():
            return False

        # 1. Check StatePermission for TRANSITION permission
        from apps.permissions.utils import check_state_permission
        from apps.permissions.models import PermissionType

        # Check permission for current state (not target - user needs permission in current state)
        if not check_state_permission(user, self, PermissionType.TRANSITION):
            return False

        # 2. Check if transition exists in template
        transition = WorkflowTransition.objects.filter(
            template=self.template,
            from_state=self.current_state,
            to_state=target_state
        ).first()

        if not transition:
            return False

        # 3. Check transition conditions
        return transition.check_condition(self)

    def can_approve_step(self, user, step_number: int) -> bool:
        """
        Check if user can approve a specific step.
        Works for both legacy and configurable workflows.
        """
        # For legacy workflows, use existing permission system
        if not self.is_configurable():
            from apps.permissions.utils import check_state_step_permission
            return check_state_step_permission(user, self, step_number)

        # For configurable workflows
        from apps.permissions.utils import check_state_step_permission
        return check_state_step_permission(user, self, step_number)

    def are_all_steps_approved(self) -> bool:
        """
        Check if all required steps in current state are approved.
        For configurable workflows only.
        """
        if not self.is_configurable():
            return False

        required_steps = self.current_state.get_required_steps_count()
        if required_steps == 0:
            return True

        completed_steps = self.completed_steps.get(str(self.current_state.id), {})
        return len(completed_steps) >= required_steps

    def get_available_transitions(self, user) -> List[WorkflowTransition]:
        """
        Get list of possible transitions from current state.
        Filters by user permissions and transition conditions.
        """
        if not self.is_configurable():
            return []

        transitions = WorkflowTransition.objects.filter(
            template=self.template,
            from_state=self.current_state
        ).select_related('to_state').order_by('order')

        available = []
        for transition in transitions:
            # Check if user can transition
            if self.can_transition_to(user, transition.to_state):
                available.append(transition)

        return available

    def perform_configurable_transition(self, transition: WorkflowTransition, by=None):
        """
        Perform a transition in the configurable workflow system.
        Updates current_state, resets steps, and logs action.
        """
        if not self.is_configurable():
            raise ValueError("This workflow is not using the configurable system")

        if not transition.check_condition(self):
            raise ValueError("Transition conditions not met")

        old_state = self.current_state

        # Update state
        self.current_state = transition.to_state
        self.current_step = 0
        # Keep history of completed steps per state
        # completed_steps structure: {state_id: {step_num: {by, at, data}}}
        # Don't clear - we keep the history

        # Update legacy state field for backwards compatibility
        # Use update_fields to bypass FSM protection
        with transaction.atomic():
            # Save without updating FSM field first
            self.save(update_fields=['current_state', 'current_step', 'completed_steps', 'updated_at'])

            # Then update the FSM state field directly via queryset update
            Workflow.objects.filter(pk=self.pk).update(state=transition.to_state.code)

            # Update instance's internal state dict to reflect DB change
            # This bypasses FSM's __setattr__ by directly modifying __dict__
            self.__dict__['state'] = transition.to_state.code

            # Log action
            Action.objects.create(
                workflow=self,
                action_type=f"transition_{old_state.code}_to_{transition.to_state.code}",
                state=transition.to_state.code,
                step=0,  # Transitions are not tied to specific steps
                performer=by
            )

        return True

    def advance_to_next_state(self, by=None):
        """
        A helper method to trigger the correct transition based on current state.
        Supports both legacy FSM and configurable workflow systems.
        """
        # For configurable workflows, use automatic transitions
        if self.is_configurable():
            # Find automatic transition from current state
            automatic_transitions = WorkflowTransition.objects.filter(
                template=self.template,
                from_state=self.current_state,
                is_automatic=True
            ).select_related('to_state').order_by('order')

            for transition in automatic_transitions:
                # Check if conditions are met
                if transition.check_condition(self):
                    # Perform the transition
                    self.perform_configurable_transition(transition, by=by)
                    return True

            # No automatic transition available
            return False

        # Legacy FSM workflow logic
        current_state_name = self.state

        # 1. Find the name of the next state from the spec.NEXT_STATE map
        next_state_name = NEXT_STATE.get(current_state_name)

        if not next_state_name:
            return False  # We are at the end of the flow

        # 2. Construct the transition method name (e.g., "to_CEOInstruction")
        next_method_name = f"to_{next_state_name}"

        # 3. Get the actual method object from the instance
        transition_method = getattr(self, next_method_name, None)

        if transition_method and callable(transition_method):
            with transaction.atomic():
                transition_method(by=by)
                self.save()  # Save the state change
            return True

        return False


class Action(models.Model):
    class ActionType(models.TextChoices):
        APPROVE = "APPROVE"
        UPLOAD = "UPLOAD"
        COMMENT = "COMMENT"

    workflow = models.ForeignKey("workflows.Workflow", on_delete=models.CASCADE, related_name="actions")
    state = models.CharField(max_length=64)
    step = models.IntegerField(help_text="0-based for approvals")
    action_type = models.CharField(max_length=64, choices=ActionType.choices)
    performer = models.ForeignKey(User, on_delete=models.PROTECT)
    role_code = models.CharField(max_length=64, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Enforce only one approval row per (workflow,state,step)
        unique_together = [("workflow", "state", "step")]
        indexes = [models.Index(fields=["workflow", "state", "step"])]

class Attachment(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="attachments/", storage=S3Boto3Storage())
    name = models.CharField(max_length=200, default="پیوست")
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Comment(models.Model):
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="comments")
    text = models.TextField()
    author = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.author.username}"