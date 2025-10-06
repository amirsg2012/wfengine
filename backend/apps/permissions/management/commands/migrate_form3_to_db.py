# apps/permissions/management/commands/migrate_form3_to_db.py
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.permissions.models import StateStepPermission
from apps.accounts.models import OrgRole


class Command(BaseCommand):
    help = 'Migrate Form3 hardcoded APPROVAL_STEPS to StateStepPermission records'

    def handle(self, *args, **options):
        self.stdout.write('Migrating Form3 approval steps to database...')

        # Form3 approval chain definition
        form3_steps = [
            {
                'step': 0,
                'role_code': 'LC_CONTRACTS_ASSEMBLIES_LEAD',
                'section': 'legalDeputyReport',
                'action_type': 'FILL',
                'signature_field': '',
                'description': 'تکمیل گزارش معاونت حقوقی'
            },
            {
                'step': 1,
                'role_code': 'LC_MANAGER',
                'section': 'legalDeputyReport',
                'action_type': 'APPROVE',
                'signature_field': 'legalDeputyReport.headOfContractsSignature',
                'description': 'تأیید گزارش حقوقی توسط مدیر'
            },
            {
                'step': 2,
                'role_code': 'RE_TECH_URBANISM_LEAD',
                'section': 'realEstateDeputyReport',
                'action_type': 'FILL',
                'signature_field': '',
                'description': 'تکمیل گزارش معاونت املاک'
            },
            {
                'step': 3,
                'role_code': 'RE_ACQUISITION_REGEN_LEAD',
                'section': 'realEstateDeputyReport',
                'action_type': 'APPROVE',
                'signature_field': 'realEstateDeputyReport.acquisitionManagerSignature',
                'description': 'تأیید توسط مدیر تملیک'
            },
            {
                'step': 4,
                'role_code': 'RE_MANAGER',
                'section': 'realEstateDeputyReport',
                'action_type': 'APPROVE',
                'signature_field': 'realEstateDeputyReport.realEstateDeputySignature',
                'description': 'تأیید گزارش املاک توسط معاون'
            },
            {
                'step': 5,
                'role_code': 'CEO_MANAGER',
                'section': 'finalApproval',
                'action_type': 'APPROVE',
                'signature_field': 'finalApproval.ceoSignature',
                'description': 'تأیید نهایی مدیرعامل'
            },
            {
                'step': 6,
                'role_code': 'CHAIRMAN_OF_BOARD',
                'section': 'finalApproval',
                'action_type': 'APPROVE',
                'signature_field': 'finalApproval.chairmanOfTheBoardSignature',
                'description': 'تأیید نهایی رئیس هیئت مدیره'
            },
        ]

        with transaction.atomic():
            # Clear existing Form3 step permissions
            deleted_count = StateStepPermission.objects.filter(state='Form3').delete()[0]
            self.stdout.write(f'Deleted {deleted_count} existing Form3 step permissions')

            # Create new step permissions
            created_count = 0
            for step_data in form3_steps:
                try:
                    # Get the role
                    role = OrgRole.objects.get(code=step_data['role_code'])

                    # Create StateStepPermission
                    StateStepPermission.objects.create(
                        state='Form3',
                        step=step_data['step'],
                        section=step_data['section'],
                        action_type=step_data['action_type'],
                        signature_field=step_data['signature_field'] if step_data['signature_field'] else None,
                        description=step_data['description'],
                        role=role,
                        is_active=True
                    )
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Created step {step_data['step']}: {step_data['description']} "
                            f"({step_data['action_type']}) for {role.name_fa}"
                        )
                    )
                except OrgRole.DoesNotExist:
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠ Role '{step_data['role_code']}' not found. Skipping step {step_data['step']}. "
                            f"Run 'python manage.py bootstrap_org_roles' first."
                        )
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✅ Successfully migrated {created_count} Form3 steps to database!'
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    'Form3 is now fully admin-configurable via /admin/permissions/statesteppermission/'
                )
            )
