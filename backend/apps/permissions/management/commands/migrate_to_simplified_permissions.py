# apps/permissions/management/commands/migrate_to_simplified_permissions.py
"""
Management command to migrate from old permission system to simplified state-step based system.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.permissions.models import (
    StateStepPermission as OldStateStepPermission,
    WorkflowState,
    WorkflowStateStep,
    WorkflowStateStepPermission,
)
from apps.workflows.workflow_spec import ADVANCER_STEPS, STATE_ORDER
from apps.accounts.models import OrgRole


class Command(BaseCommand):
    help = 'Migrate from old permission system to simplified state-step based permissions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing simplified permissions before migrating',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing simplified permissions...')
            WorkflowStateStepPermission.objects.all().delete()
            WorkflowStateStep.objects.all().delete()
            WorkflowState.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared all simplified permissions'))

        self.stdout.write('Creating workflow states from STATE_ORDER...')
        self._create_workflow_states()

        self.stdout.write('Creating workflow steps from ADVANCER_STEPS...')
        self._create_workflow_steps()

        self.stdout.write('Migrating StateStepPermissions to WorkflowStateStepPermissions...')
        self._migrate_step_permissions()

        self.stdout.write(self.style.SUCCESS('Successfully migrated to simplified permissions'))

    def _create_workflow_states(self):
        """Create WorkflowState records from STATE_ORDER"""
        created_count = 0

        for order, state_code in enumerate(STATE_ORDER):
            state, created = WorkflowState.objects.get_or_create(
                code=state_code,
                defaults={
                    'name_en': state_code,
                    'name_fa': self._get_persian_name(state_code),
                    'order': order,
                    'is_active': True,
                }
            )

            if created:
                created_count += 1
                self.stdout.write(f'  Created state: {state_code}')

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} workflow states'))

    def _create_workflow_steps(self):
        """Create WorkflowStateStep records from ADVANCER_STEPS"""
        created_count = 0

        for state_code, steps in ADVANCER_STEPS.items():
            try:
                state = WorkflowState.objects.get(code=state_code)
            except WorkflowState.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  State not found: {state_code}'))
                continue

            for step_num, role_codes in enumerate(steps):
                # Create the step
                step, created = WorkflowStateStep.objects.get_or_create(
                    state=state,
                    step_number=step_num,
                    defaults={
                        'name_en': f'Step {step_num}',
                        'name_fa': f'گام {step_num}',
                        'description_fa': self._get_step_description(state_code, step_num, role_codes),
                        'action_type': 'APPROVE',
                        'requires_all_approvers': False,  # Parallel approval (any one can approve)
                        'is_active': True,
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(f'  Created step: {state_code} - Step {step_num}')

                    # Create permissions for each role
                    for role_code in role_codes:
                        try:
                            role = OrgRole.objects.get(code=role_code)
                            WorkflowStateStepPermission.objects.get_or_create(
                                step=step,
                                role=role,
                                defaults={'is_active': True}
                            )
                            self.stdout.write(f'    Added role: {role_code}')
                        except OrgRole.DoesNotExist:
                            self.stdout.write(self.style.WARNING(f'    Role not found: {role_code}'))

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} workflow steps'))

    def _migrate_step_permissions(self):
        """Migrate old StateStepPermissions to new WorkflowStateStepPermissions"""
        migrated_count = 0

        old_perms = OldStateStepPermission.objects.filter(is_active=True)

        for old_perm in old_perms:
            try:
                state = WorkflowState.objects.get(code=old_perm.state)
                step = state.steps.get(step_number=old_perm.step)

                # Create new permission
                new_perm, created = WorkflowStateStepPermission.objects.get_or_create(
                    step=step,
                    role=old_perm.role,
                    user=old_perm.user,
                    defaults={'is_active': old_perm.is_active}
                )

                if created:
                    migrated_count += 1
                    target = old_perm.role.code if old_perm.role else old_perm.user.username
                    self.stdout.write(f'  Migrated: {old_perm.state} - Step {old_perm.step} - {target}')

            except (WorkflowState.DoesNotExist, WorkflowStateStep.DoesNotExist) as e:
                self.stdout.write(self.style.WARNING(f'  Could not migrate: {old_perm} - {e}'))

        self.stdout.write(self.style.SUCCESS(f'Migrated {migrated_count} step permissions'))

    def _get_persian_name(self, state_code):
        """Get Persian name for state"""
        persian_names = {
            'ApplicantRequest': 'درخواست متقاضی',
            'CEOInstruction': 'دستور مدیرعامل',
            'Form1': 'فرم ۱',
            'Form2': 'فرم ۲',
            'DocsCollection': 'جمع‌آوری اسناد',
            'Form3': 'فرم ۳',
            'Form4': 'فرم ۴',
            'AMLForm': 'فرم AML',
            'EvaluationCommittee': 'کمیته ارزیابی',
            'AppraisalFeeDeposit': 'واریز هزینه ارزیابی',
            'AppraisalNotice': 'اطلاعیه ارزیابی',
            'AppraisalOpinion': 'نظریه ارزیابی',
            'AppraisalDecision': 'تصمیم ارزیابی',
            'Settlment': 'تسویه',
        }
        return persian_names.get(state_code, state_code)

    def _get_step_description(self, state_code, step_num, role_codes):
        """Generate Persian description for step"""
        role_names = ', '.join(role_codes)
        return f'گام {step_num} - تایید توسط: {role_names}'
