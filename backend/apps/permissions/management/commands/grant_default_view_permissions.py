# apps/permissions/management/commands/grant_default_view_permissions.py
"""
Grant default VIEW permissions to all roles for all workflow states.
This ensures all users can see workflows in the list.
"""
from django.core.management.base import BaseCommand
from apps.permissions.models import StatePermission, PermissionType
from apps.accounts.models import OrgRole
from apps.workflows.models import WorkflowState


class Command(BaseCommand):
    help = 'Grant VIEW permission to all roles for all workflow states'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing VIEW permissions first'
        )

    def handle(self, *args, **options):
        clear = options.get('clear', False)

        if clear:
            deleted_count = StatePermission.objects.filter(
                permission_type=PermissionType.VIEW
            ).delete()[0]
            self.stdout.write(self.style.WARNING(f'Cleared {deleted_count} existing VIEW permissions'))

        # Get all roles
        roles = OrgRole.objects.all()
        self.stdout.write(f'Found {roles.count()} roles')

        # Get all workflow states
        states = WorkflowState.objects.all()
        self.stdout.write(f'Found {states.count()} states')

        created_count = 0
        existing_count = 0

        for role in roles:
            for state in states:
                permission, created = StatePermission.objects.get_or_create(
                    role=role,
                    state=state.code,
                    permission_type=PermissionType.VIEW,
                    defaults={
                        'is_active': True,
                        'restrict_to_own': False
                    }
                )

                if created:
                    created_count += 1
                    self.stdout.write(f'  ✓ Created VIEW permission: {role.code} → {state.code}')
                else:
                    existing_count += 1

        self.stdout.write(self.style.SUCCESS(f'\n✓ Summary:'))
        self.stdout.write(f'  Created: {created_count}')
        self.stdout.write(f'  Already existed: {existing_count}')
        self.stdout.write(f'  Total: {created_count + existing_count}')
