# apps/permissions/management/commands/bootstrap_permissions.py
"""
Management command to bootstrap default permissions for the workflow system.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.accounts.models import OrgRole
from apps.permissions.models import (
    StatePermission,
    StateStepPermission,
    FormPermission,
    FormFieldPermission,
    PermissionType
)
from apps.workflows.workflow_spec import STATE_ORDER, ADVANCER_STEPS


class Command(BaseCommand):
    help = 'Bootstrap default permissions for workflow system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing permissions before bootstrapping',
        )

    def handle(self, *args, **options):
        clear = options.get('clear', False)

        if clear:
            self.stdout.write(self.style.WARNING('Clearing existing permissions...'))
            StatePermission.objects.all().delete()
            StateStepPermission.objects.all().delete()
            FormPermission.objects.all().delete()
            FormFieldPermission.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Permissions cleared.'))

        with transaction.atomic():
            self._create_state_permissions()
            self._create_state_step_permissions()
            self._create_form_permissions()
            self._create_form_field_permissions()

        self.stdout.write(self.style.SUCCESS('Successfully bootstrapped permissions!'))

    def _create_state_permissions(self):
        """Create default state-level permissions"""
        self.stdout.write('Creating state permissions...')

        # Define default permissions for each state
        state_permission_map = {
            # State: {role_code: [permission_types]}
            'ApplicantRequest': {
                'RE_VALUATION_LEASING_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW],
                'CEO_MANAGER': [PermissionType.VIEW],
            },
            'CEOInstruction': {
                'CEO_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'CEO_OFFICE_CHIEF': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            'Form1': {
                'RE_ACQUISITION_REGEN_EXPERT': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            'Form2': {
                'RE_ACQUISITION_REGEN_EXPERT': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            'DocsCollection': {
                'RE_ACQUISITION_REGEN_EXPERT': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            'Form3': {
                'LC_CONTRACTS_ASSEMBLIES_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'LC_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_TECH_URBANISM_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'CEO_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
            },
            'Form4': {
                'RE_VALUATION_LEASING_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'CEO_MANAGER': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
            },
            'AMLForm': {
                'FA_ACCOUNTING_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            'EvaluationCommittee': {
                'RE_VALUATION_LEASING_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
                'RE_MANAGER': [PermissionType.VIEW],
            },
        }

        # Apply to all remaining states
        default_roles = {
            'RE_VALUATION_LEASING_LEAD': [PermissionType.VIEW, PermissionType.EDIT, PermissionType.APPROVE],
            'RE_MANAGER': [PermissionType.VIEW],
        }

        created_count = 0
        for state in STATE_ORDER:
            perms = state_permission_map.get(state, default_roles)

            for role_code, perm_types in perms.items():
                try:
                    role = OrgRole.objects.get(code=role_code)

                    for perm_type in perm_types:
                        StatePermission.objects.get_or_create(
                            state=state,
                            permission_type=perm_type,
                            role=role,
                            defaults={'is_active': True}
                        )
                        created_count += 1
                except OrgRole.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'Role {role_code} not found, skipping...')
                    )

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} state permissions'))

    def _create_state_step_permissions(self):
        """Create step-level permissions based on ADVANCER_STEPS"""
        self.stdout.write('Creating state step permissions...')

        created_count = 0
        for state, steps in ADVANCER_STEPS.items():
            for step_idx, role_codes in enumerate(steps):
                for role_code in role_codes:
                    try:
                        role = OrgRole.objects.get(code=role_code)

                        StateStepPermission.objects.get_or_create(
                            state=state,
                            step=step_idx,
                            role=role,
                            defaults={'is_active': True}
                        )
                        created_count += 1
                    except OrgRole.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(f'Role {role_code} not found for {state} step {step_idx}')
                        )

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} state step permissions'))

    def _create_form_permissions(self):
        """Create form-level permissions"""
        self.stdout.write('Creating form permissions...')

        # Define form permissions
        form_permissions = {
            1: {  # Form 1
                'RE_ACQUISITION_REGEN_EXPERT': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            2: {  # Form 2
                'RE_ACQUISITION_REGEN_EXPERT': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW],
                'RE_MANAGER': [PermissionType.VIEW],
            },
            3: {  # Form 3 - Complex multi-role form
                'LC_CONTRACTS_ASSEMBLIES_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'LC_MANAGER': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_TECH_URBANISM_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_ACQUISITION_REGEN_LEAD': [PermissionType.VIEW, PermissionType.EDIT],
                'RE_MANAGER': [PermissionType.VIEW, PermissionType.EDIT],
                'CEO_MANAGER': [PermissionType.VIEW, PermissionType.EDIT],
            },
        }

        created_count = 0
        for form_number, role_perms in form_permissions.items():
            for role_code, perm_types in role_perms.items():
                try:
                    role = OrgRole.objects.get(code=role_code)

                    for perm_type in perm_types:
                        FormPermission.objects.get_or_create(
                            form_number=form_number,
                            permission_type=perm_type,
                            role=role,
                            defaults={'is_active': True}
                        )
                        created_count += 1
                except OrgRole.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(f'Role {role_code} not found')
                    )

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} form permissions'))

    def _create_form_field_permissions(self):
        """Create field-level permissions for Form3"""
        self.stdout.write('Creating form field permissions...')

        # Form 3 field permissions
        form3_field_permissions = {
            'LC_CONTRACTS_ASSEMBLIES_LEAD': {
                'fields': [
                    'legalDeputyReport.legalStatus',
                    'legalDeputyReport.registrationStatus',
                    'legalDeputyReport.notes',
                ],
                'state': 'Form3'
            },
            'LC_MANAGER': {
                'fields': [
                    'legalDeputyReport.headOfContractsSignature',
                ],
                'state': 'Form3'
            },
            'RE_TECH_URBANISM_LEAD': {
                'fields': [
                    'realEstateDeputyReport.propertyType',
                    'realEstateDeputyReport.totalArea',
                    'realEstateDeputyReport.notes',
                ],
                'state': 'Form3'
            },
            'RE_ACQUISITION_REGEN_LEAD': {
                'fields': [
                    'realEstateDeputyReport.acquisitionManagerSignature',
                ],
                'state': 'Form3'
            },
            'RE_MANAGER': {
                'fields': [
                    'realEstateDeputyReport.realEstateDeputySignature',
                ],
                'state': 'Form3'
            },
            'CEO_MANAGER': {
                'fields': [
                    'ceoApproval.ceoSignature',
                    'ceoApproval.finalDecision',
                ],
                'state': 'Form3'
            },
        }

        created_count = 0
        for role_code, config in form3_field_permissions.items():
            try:
                role = OrgRole.objects.get(code=role_code)

                for field_path in config['fields']:
                    FormFieldPermission.objects.get_or_create(
                        form_number=3,
                        field_path=field_path,
                        permission_type=PermissionType.EDIT,
                        role=role,
                        state=config['state'],
                        defaults={'is_active': True}
                    )
                    created_count += 1
            except OrgRole.DoesNotExist:
                self.stdout.write(
                    self.style.WARNING(f'Role {role_code} not found')
                )

        self.stdout.write(self.style.SUCCESS(f'Created {created_count} form field permissions'))
