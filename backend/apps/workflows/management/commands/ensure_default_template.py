# apps/workflows/management/commands/ensure_default_template.py
"""
Management command to ensure a default workflow template exists.
This template will be used by the frontend for all new workflows.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.workflows.models import (
    WorkflowTemplate,
    WorkflowState,
    WorkflowStateStep,
    WorkflowTransition,
    StateType,
    TransitionConditionType
)
from apps.workflows.workflow_spec import ADVANCER_STEPS


class Command(BaseCommand):
    help = 'Ensures default PROPERTY_ACQUISITION workflow template exists'

    def handle(self, *args, **options):
        self.stdout.write('Ensuring default workflow template exists...')

        with transaction.atomic():
            # Create or get the default template
            template, created = WorkflowTemplate.objects.get_or_create(
                code='PROPERTY_ACQUISITION',
                defaults={
                    'name': 'Property Acquisition Workflow',
                    'name_fa': 'گردش کار خرید ملک',
                    'description': 'Default workflow template for property acquisition process',
                    'is_active': True
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'✓ Created template: {template.code}'))
            else:
                self.stdout.write(self.style.WARNING(f'Template already exists: {template.code}'))

            # Define state configuration
            states_config = [
                {
                    'code': 'ApplicantRequest',
                    'name': 'Applicant Request',
                    'name_fa': 'درخواست متقاضی',
                    'state_type': StateType.APPROVAL,
                    'order': 0,
                    'is_initial': True
                },
                {
                    'code': 'CEOInstruction',
                    'name': 'CEO Instruction',
                    'name_fa': 'دستور مدیرعامل',
                    'state_type': StateType.APPROVAL,
                    'order': 1
                },
                {
                    'code': 'Form1',
                    'name': 'Form 1 - Applicant Information',
                    'name_fa': 'فرم ۱ - اطلاعات متقاضی',
                    'state_type': StateType.FORM,
                    'form_number': 1,
                    'order': 2
                },
                {
                    'code': 'Form2',
                    'name': 'Form 2 - Property Details',
                    'name_fa': 'فرم ۲ - جزئیات ملک',
                    'state_type': StateType.FORM,
                    'form_number': 2,
                    'order': 3
                },
                {
                    'code': 'DocsCollection',
                    'name': 'Documents Collection',
                    'name_fa': 'جمع‌آوری مدارک',
                    'state_type': StateType.APPROVAL,
                    'order': 4
                },
                {
                    'code': 'Form3',
                    'name': 'Form 3 - Property Status Review',
                    'name_fa': 'فرم ۳ - بررسی وضعیت ملک',
                    'state_type': StateType.FORM,
                    'form_number': 3,
                    'order': 5
                },
                {
                    'code': 'Form4',
                    'name': 'Form 4 - Valuation',
                    'name_fa': 'فرم ۴ - ارزیابی',
                    'state_type': StateType.FORM,
                    'form_number': 4,
                    'order': 6
                },
                {
                    'code': 'AMLForm',
                    'name': 'AML Form',
                    'name_fa': 'فرم ضد پولشویی',
                    'state_type': StateType.FORM,
                    'form_number': 5,
                    'order': 7
                },
                {
                    'code': 'EvaluationCommittee',
                    'name': 'Evaluation Committee',
                    'name_fa': 'کمیته ارزیابی',
                    'state_type': StateType.APPROVAL,
                    'order': 8
                },
                {
                    'code': 'AppraisalFeeDeposit',
                    'name': 'Appraisal Fee Deposit',
                    'name_fa': 'واریز کارمزد ارزیابی',
                    'state_type': StateType.APPROVAL,
                    'order': 9
                },
                {
                    'code': 'AppraisalNotice',
                    'name': 'Appraisal Notice',
                    'name_fa': 'اطلاعیه ارزیابی',
                    'state_type': StateType.APPROVAL,
                    'order': 10
                },
                {
                    'code': 'AppraisalOpinion',
                    'name': 'Appraisal Opinion',
                    'name_fa': 'نظریه ارزیابی',
                    'state_type': StateType.APPROVAL,
                    'order': 11
                },
                {
                    'code': 'AppraisalDecision',
                    'name': 'Appraisal Decision',
                    'name_fa': 'تصمیم نهایی ارزیابی',
                    'state_type': StateType.APPROVAL,
                    'order': 12
                },
                {
                    'code': 'Settlment',
                    'name': 'Settlement',
                    'name_fa': 'تسویه',
                    'state_type': StateType.APPROVAL,
                    'order': 13,
                    'is_terminal': True
                }
            ]

            # Create states
            states = {}
            for state_config in states_config:
                state, state_created = WorkflowState.objects.get_or_create(
                    template=template,
                    code=state_config['code'],
                    defaults=state_config
                )
                states[state.code] = state

                if state_created:
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created state: {state.code}'))

                # Create steps from ADVANCER_STEPS specification
                if state.code in ADVANCER_STEPS:
                    steps_spec = ADVANCER_STEPS[state.code]
                    for step_num, role_codes in enumerate(steps_spec):
                        # Handle list of role codes (first one is primary)
                        if isinstance(role_codes, list):
                            primary_role = role_codes[0] if role_codes else None
                        else:
                            primary_role = role_codes

                        step, step_created = WorkflowStateStep.objects.get_or_create(
                            state=state,
                            step_number=step_num,
                            defaults={
                                'name': f'Step {step_num + 1}',
                                'name_fa': f'مرحله {step_num + 1}',
                                'description': f'Approval step {step_num + 1}',
                                'required_role_code': primary_role,
                                'requires_signature': False,
                                'requires_comment': False
                            }
                        )

                        if step_created:
                            self.stdout.write(f'    ✓ Created step {step_num} for {state.code}')

            # Create automatic transitions between sequential states
            self.stdout.write('\nCreating transitions...')
            for i in range(len(states_config) - 1):
                from_state_code = states_config[i]['code']
                to_state_code = states_config[i + 1]['code']

                transition, trans_created = WorkflowTransition.objects.get_or_create(
                    template=template,
                    from_state=states[from_state_code],
                    to_state=states[to_state_code],
                    defaults={
                        'name': f'{from_state_code} to {to_state_code}',
                        'name_fa': f'از {states[from_state_code].name_fa} به {states[to_state_code].name_fa}',
                        'is_automatic': True,
                        'condition_type': TransitionConditionType.ALL_STEPS_APPROVED,
                        'order': i
                    }
                )

                if trans_created:
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Created transition: {from_state_code} → {to_state_code}'))

        self.stdout.write(self.style.SUCCESS('\n✓ Default workflow template is ready!'))
        self.stdout.write(f'Template: {template.name_fa} ({template.code})')
        self.stdout.write(f'States: {template.states.count()}')
        self.stdout.write(f'Transitions: {template.transitions.count()}')
