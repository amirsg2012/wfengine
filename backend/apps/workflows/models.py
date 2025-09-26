# apps/workflows/models.py
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition, ConcurrentTransitionMixin
from storages.backends.s3boto3 import S3Boto3Storage

from .workflow_spec import NEXT_STATE
from . import actions as act
import json
from datetime import datetime

User = get_user_model()

class Workflow(ConcurrentTransitionMixin, models.Model):
    # Core identification fields
    title = models.CharField(max_length=300)
    body = models.TextField(blank=True, default="")
    
    # FSM state
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

    def advance_to_next_state(self, by=None):
        """
        A helper method to trigger the correct specific transition
        based on the current state.
        """
        current_state_name = self.state

        # 1. Find the name of the next state from the spec.NEXT_STATE map
        next_state_name = NEXT_STATE.get(current_state_name)

        if not next_state_name:
            return False  # We are at the end of the flow

        # 2. Construct the transition method name (e.g., "to_CEOInstruction")
        # This is more robust than a hardcoded map.
        next_method_name = f"to_{next_state_name}"

        # 3. Get the actual method object from the instance
        transition_method = getattr(self, next_method_name, None)

        if transition_method and callable(transition_method):
            # The permission check is handled by the @transition decorator itself.
            # If the user doesn't have permission, Viewflow won't even list this
            # as an available transition. You might add an explicit check here
            # for safety if this method is called outside of the Viewflow UI.
            with transaction.atomic():
                transition_method(by=by)
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