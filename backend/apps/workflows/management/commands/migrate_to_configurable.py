# apps/workflows/management/commands/migrate_to_configurable.py

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.workflows.models import (
    WorkflowTemplate, WorkflowState, WorkflowStateStep, WorkflowTransition,
    Workflow, StateType, TransitionConditionType
)
from apps.workflows.workflow_spec import STATE_ORDER, ADVANCER_STEPS, NEXT_STATE

User = get_user_model()


class Command(BaseCommand):
    help = 'Migrate hardcoded workflow specification to configurable workflow system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating it',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing configurable workflow data before migrating',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear = options['clear']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        if clear and not dry_run:
            self.stdout.write(self.style.WARNING('Clearing existing configurable workflow data...'))
            WorkflowTransition.objects.all().delete()
            WorkflowStateStep.objects.all().delete()
            WorkflowState.objects.all().delete()
            WorkflowTemplate.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✓ Cleared existing data'))

        # Step 1: Create WorkflowTemplate
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Step 1: Creating Workflow Template ==='))

        template_data = {
            'code': 'PROPERTY_ACQUISITION',
            'name': 'Property Acquisition Workflow',
            'name_fa': 'گردش کار خرید ملک',
            'description': 'Complete property acquisition workflow with multi-stage approvals',
            'is_active': True,
        }

        if dry_run:
            self.stdout.write(f"  Would create template: {template_data['code']}")
            template = type('Template', (), {'id': 'dry_run_id', **template_data})()
        else:
            template, created = WorkflowTemplate.objects.get_or_create(
                code=template_data['code'],
                defaults=template_data
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created template: {template.code}"))
            else:
                self.stdout.write(self.style.WARNING(f"  ⚠ Template already exists: {template.code}"))

        # Step 2: Create WorkflowStates from STATE_ORDER
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Step 2: Creating Workflow States ==='))

        # State labels in Persian
        STATE_LABELS_FA = {
            'ApplicantRequest': 'درخواست متقاضی',
            'CEOInstruction': 'دستور مدیرعامل',
            'Form1': 'فرم 1 - اطلاعات متقاضی',
            'Form2': 'فرم 2 - مشخصات ملک',
            'DocsCollection': 'جمع‌آوری مدارک',
            'Form3': 'فرم 3 - بررسی وضعیت ملک',
            'Form4': 'فرم 4 - ارزیابی',
            'AMLForm': 'فرم AML',
            'EvaluationCommittee': 'کمیته ارزیابی',
            'AppraisalFeeDeposit': 'پرداخت هزینه ارزیابی',
            'AppraisalNotice': 'اطلاعیه ارزیابی',
            'AppraisalOpinion': 'نظریه ارزیابی',
            'AppraisalDecision': 'تصمیم ارزیابی',
            'Settlment': 'تسویه حساب',
        }

        # Determine which states are forms
        FORM_STATES = {
            'Form1': 1,
            'Form2': 2,
            'Form3': 3,
            'Form4': 4,
            'AMLForm': 5,
        }

        state_objects = {}
        for order, state_code in enumerate(STATE_ORDER):
            state_data = {
                'code': state_code,
                'name': state_code.replace('_', ' '),
                'name_fa': STATE_LABELS_FA.get(state_code, state_code),
                'order': order,
                'is_initial': (order == 0),
                'is_terminal': (order == len(STATE_ORDER) - 1),
                'allow_edit': True,
                'allow_back': False,
                'require_all_steps': True,
            }

            # Determine state type and form number
            if state_code in FORM_STATES:
                state_data['state_type'] = StateType.FORM
                state_data['form_number'] = FORM_STATES[state_code]
            else:
                state_data['state_type'] = StateType.APPROVAL
                state_data['form_number'] = None

            if dry_run:
                self.stdout.write(f"  Would create state: {state_code} (order={order}, type={state_data['state_type']})")
                state_objects[state_code] = type('State', (), {'id': f'dry_run_{state_code}', **state_data})()
            else:
                state, created = WorkflowState.objects.get_or_create(
                    template=template,
                    code=state_code,
                    defaults=state_data
                )
                state_objects[state_code] = state

                if created:
                    self.stdout.write(self.style.SUCCESS(f"  ✓ Created state: {state_code} (order={order})"))
                else:
                    self.stdout.write(self.style.WARNING(f"  ⚠ State already exists: {state_code}"))

        # Step 3: Create WorkflowStateSteps from ADVANCER_STEPS
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Step 3: Creating Workflow State Steps ==='))

        # Step name mapping for known states
        STEP_NAMES = {
            'ApplicantRequest': ['Valuation Lead Approval'],
            'CEOInstruction': ['CEO/Office Chief Approval'],
            'Form1': ['Acquisition Expert Review'],
            'Form2': ['Acquisition Expert Review'],
            'DocsCollection': ['Document Collection Review'],
            'Form3': [
                'Legal Deputy Review',
                'Technical/Urbanism Lead Review',
                'Acquisition Lead Review',
                'Real Estate Manager Review',
            ],
            'Form4': [
                'Valuation Lead Review',
                'Acquisition Lead Review',
                'Real Estate Manager Review',
                'CEO/Office Chief Approval',
            ],
            'AMLForm': ['Accounting Lead Review'],
            'EvaluationCommittee': ['Valuation Lead Approval'],
            'AppraisalFeeDeposit': ['Valuation Lead Approval'],
            'AppraisalNotice': ['Valuation Lead Approval'],
            'AppraisalOpinion': ['Valuation Lead Approval'],
            'AppraisalDecision': ['Valuation Lead Approval'],
            'Settlment': ['Acquisition Lead Final Approval'],
        }

        STEP_NAMES_FA = {
            'ApplicantRequest': ['تایید مسئول ارزیابی'],
            'CEOInstruction': ['تایید مدیرعامل/رئیس دفتر'],
            'Form1': ['بررسی کارشناس خرید'],
            'Form2': ['بررسی کارشناس خرید'],
            'DocsCollection': ['بررسی جمع‌آوری مدارک'],
            'Form3': [
                'بررسی معاون حقوقی',
                'بررسی مسئول فنی و شهرسازی',
                'بررسی مسئول خرید',
                'تایید مدیر املاک',
            ],
            'Form4': [
                'بررسی مسئول ارزیابی',
                'بررسی مسئول خرید',
                'تایید مدیر املاک',
                'تایید مدیرعامل/رئیس دفتر',
            ],
            'AMLForm': ['بررسی مسئول حسابداری'],
            'EvaluationCommittee': ['تایید مسئول ارزیابی'],
            'AppraisalFeeDeposit': ['تایید مسئول ارزیابی'],
            'AppraisalNotice': ['تایید مسئول ارزیابی'],
            'AppraisalOpinion': ['تایید مسئول ارزیابی'],
            'AppraisalDecision': ['تایید مسئول ارزیابی'],
            'Settlment': ['تایید نهایی مسئول خرید'],
        }

        step_count = 0
        for state_code, role_lists in ADVANCER_STEPS.items():
            if state_code not in state_objects:
                self.stdout.write(self.style.WARNING(f"  ⚠ Skipping steps for unknown state: {state_code}"))
                continue

            state = state_objects[state_code]
            step_names = STEP_NAMES.get(state_code, [])
            step_names_fa = STEP_NAMES_FA.get(state_code, [])

            for step_number, role_codes in enumerate(role_lists):
                # role_codes is a list of role codes (e.g., ["CEO_MANAGER", "CEO_OFFICE_CHIEF"])
                step_name = step_names[step_number] if step_number < len(step_names) else f"Step {step_number}"
                step_name_fa = step_names_fa[step_number] if step_number < len(step_names_fa) else f"گام {step_number}"

                step_data = {
                    'step_number': step_number,
                    'name': step_name,
                    'name_fa': step_name_fa,
                    'description': f"Requires approval from: {', '.join(role_codes)}",
                    'requires_signature': False,  # Will be configured manually later
                    'signature_field_path': '',
                    'requires_comment': False,
                    'editable_fields': [],  # Will be configured manually later
                    'parallel_group': None,
                }

                if dry_run:
                    self.stdout.write(f"  Would create step: {state_code}.{step_number} - {step_name} ({', '.join(role_codes)})")
                else:
                    step, created = WorkflowStateStep.objects.get_or_create(
                        state=state,
                        step_number=step_number,
                        defaults=step_data
                    )

                    if created:
                        self.stdout.write(self.style.SUCCESS(
                            f"  ✓ Created step: {state_code}.{step_number} - {step_name}"
                        ))
                        step_count += 1
                    else:
                        self.stdout.write(self.style.WARNING(
                            f"  ⚠ Step already exists: {state_code}.{step_number}"
                        ))

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"\nCreated {step_count} steps"))

        # Step 4: Create WorkflowTransitions from NEXT_STATE
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Step 4: Creating Workflow Transitions ==='))

        transition_count = 0
        for from_state_code, to_state_code in NEXT_STATE.items():
            if from_state_code not in state_objects:
                self.stdout.write(self.style.WARNING(f"  ⚠ Skipping transition from unknown state: {from_state_code}"))
                continue

            if to_state_code not in state_objects:
                self.stdout.write(self.style.WARNING(f"  ⚠ Skipping transition to unknown state: {to_state_code}"))
                continue

            from_state = state_objects[from_state_code]
            to_state = state_objects[to_state_code]

            transition_data = {
                'name': f"{from_state_code} to {to_state_code}",
                'name_fa': f"{STATE_LABELS_FA.get(from_state_code, from_state_code)} به {STATE_LABELS_FA.get(to_state_code, to_state_code)}",
                'is_automatic': True,
                'order': 0,
            }

            # Determine condition type based on whether state has steps
            if from_state_code in ADVANCER_STEPS and ADVANCER_STEPS[from_state_code]:
                transition_data['condition_type'] = TransitionConditionType.ALL_STEPS_APPROVED
            else:
                transition_data['condition_type'] = TransitionConditionType.ALWAYS

            if dry_run:
                self.stdout.write(
                    f"  Would create transition: {from_state_code} → {to_state_code} "
                    f"({transition_data['condition_type']})"
                )
            else:
                transition, created = WorkflowTransition.objects.get_or_create(
                    template=template,
                    from_state=from_state,
                    to_state=to_state,
                    defaults=transition_data
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✓ Created transition: {from_state_code} → {to_state_code}"
                    ))
                    transition_count += 1
                else:
                    self.stdout.write(self.style.WARNING(
                        f"  ⚠ Transition already exists: {from_state_code} → {to_state_code}"
                    ))

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f"\nCreated {transition_count} transitions"))

        # Step 5: Update existing Workflow instances
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Step 5: Updating Existing Workflows ==='))

        if dry_run:
            workflow_count = Workflow.objects.filter(template__isnull=True).count()
            self.stdout.write(f"  Would update {workflow_count} workflows to use template")
        else:
            updated_count = 0
            skipped_count = 0

            for workflow in Workflow.objects.filter(template__isnull=True):
                # Map FSM state to WorkflowState
                state_code = workflow.state

                if state_code not in state_objects:
                    self.stdout.write(self.style.WARNING(
                        f"  ⚠ Workflow {workflow.id} has unknown state: {state_code}"
                    ))
                    skipped_count += 1
                    continue

                workflow.template = template
                workflow.current_state = state_objects[state_code]
                workflow.current_step = 0  # Reset to first step
                workflow.completed_steps = {}  # Clear completed steps
                workflow.save()

                updated_count += 1

            self.stdout.write(self.style.SUCCESS(f"\n  ✓ Updated {updated_count} workflows"))
            if skipped_count > 0:
                self.stdout.write(self.style.WARNING(f"  ⚠ Skipped {skipped_count} workflows"))

        # Summary
        self.stdout.write(self.style.MIGRATE_HEADING('\n=== Migration Summary ==='))
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS(
                f"✓ Created template: {template.code}\n"
                f"✓ Created {len(state_objects)} states\n"
                f"✓ Created {step_count} approval steps\n"
                f"✓ Created {transition_count} transitions\n"
                f"✓ Updated workflows to use configurable system"
            ))

            self.stdout.write(self.style.MIGRATE_HEADING('\n=== Next Steps ==='))
            self.stdout.write(
                "1. Review created workflow template in Django admin\n"
                "2. Test workflow transitions with configurable system\n"
                "3. Verify permissions still work correctly\n"
                "4. Gradually deprecate hardcoded workflow_spec.py\n"
                "5. Build visual workflow builder UI (Phase 2.3)"
            )
