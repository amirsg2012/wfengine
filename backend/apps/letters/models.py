# apps/letters/models.py
from django.db import models, transaction
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition, ConcurrentTransitionMixin
from .workflow_spec import STATE_ORDER, NEXT_STATE
from .approvals import approvals_ok

User = get_user_model()

class Letter(ConcurrentTransitionMixin, models.Model):
    # core fields
    title = models.CharField(max_length=300)
    body = models.TextField()
    attachment = models.FileField(upload_to="attachments/", null=True, blank=True)

    # FSM state
    class State(models.TextChoices):
        ApplicantRequest     = "ApplicantRequest"
        CEOInstruction       = "CEOInstruction"
        Form1                = "Form1"
        Form2                = "Form2"
        DocsCollection       = "DocsCollection"
        Form3                = "Form3"
        Form4                = "Form4"
        AMLForm              = "AMLForm"
        EvaluationCommittee  = "EvaluationCommittee"
        AppraisalFeeDeposit  = "AppraisalFeeDeposit"
        AppraisalNotice      = "AppraisalNotice"
        AppraisalOpinion     = "AppraisalOpinion"
        AppraisalDecision    = "AppraisalDecision"
        Settlment            = "Settlment"

    state = FSMField(default=State.ApplicantRequest, choices=State.choices, protected=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="letters")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ---- Transitions (linear) ----
    @transition(field=state, source=State.ApplicantRequest, target=State.CEOInstruction,
               conditions=[approvals_ok])
    def to_CEOInstruction(self, by=None): pass

    @transition(field=state, source=State.CEOInstruction, target=State.Form1,
               conditions=[approvals_ok])
    def to_Form1(self, by=None): pass

    @transition(field=state, source=State.Form1, target=State.Form2,
               conditions=[approvals_ok])
    def to_Form2(self, by=None): pass

    @transition(field=state, source=State.Form2, target=State.DocsCollection,
               conditions=[approvals_ok])
    def to_DocsCollection(self, by=None): pass

    @transition(field=state, source=State.DocsCollection, target=State.Form3,
               conditions=[approvals_ok])
    def to_Form3(self, by=None): pass

    @transition(field=state, source=State.Form3, target=State.Form4,
               conditions=[approvals_ok])
    def to_Form4(self, by=None): pass

    @transition(field=state, source=State.Form4, target=State.AMLForm,
               conditions=[approvals_ok])
    def to_AMLForm(self, by=None): pass

    @transition(field=state, source=State.AMLForm, target=State.EvaluationCommittee,
               conditions=[approvals_ok])
    def to_EvaluationCommittee(self, by=None): pass

    @transition(field=state, source=State.EvaluationCommittee, target=State.AppraisalFeeDeposit,
               conditions=[approvals_ok])
    def to_AppraisalFeeDeposit(self, by=None): pass

    @transition(field=state, source=State.AppraisalFeeDeposit, target=State.AppraisalNotice,
               conditions=[approvals_ok])
    def to_AppraisalNotice(self, by=None): pass

    @transition(field=state, source=State.AppraisalNotice, target=State.AppraisalOpinion,
               conditions=[approvals_ok])
    def to_AppraisalOpinion(self, by=None): pass

    @transition(field=state, source=State.AppraisalOpinion, target=State.AppraisalDecision,
               conditions=[approvals_ok])
    def to_AppraisalDecision(self, by=None): pass

    @transition(field=state, source=State.AppraisalDecision, target=State.Settlment,
               conditions=[approvals_ok])
    def to_Settlment(self, by=None): pass

    # helper to call the right transition dynamically
    def advance_to_next(self, by=None):
        cur = self.state
        if cur not in NEXT_STATE:
            return False
        target = NEXT_STATE[cur]
        method = getattr(self, f"to_{target}", None)
        if not method:
            return False
        with transaction.atomic():
            method(by=by)
            self.save()
        return True
