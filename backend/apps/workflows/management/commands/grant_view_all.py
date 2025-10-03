# apps/workflows/management/commands/grant_view_all.py
"""
Management command to grant VIEW permissions to all workflow states for a role
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import OrgRole
from apps.permissions.models import StatePermission, PermissionType
from apps.workflows.workflow_spec import STATE_ORDER


class Command(BaseCommand):
    help = 'Grant VIEW permission to all workflow states for a role'

    def add_arguments(self, parser):
        parser.add_argument('role_code', type=str, help='Role code (e.g., RE_VALUATION_LEASING_LEAD)')
        parser.add_argument(
            '--restrict-to-own',
            action='store_true',
            help='Set restrict_to_own=True (user can only see their own workflows)'
        )

    def handle(self, *args, **options):
        role_code = options['role_code']
        restrict_to_own = options.get('restrict_to_own', False)

        try:
            role = OrgRole.objects.get(code=role_code)
        except OrgRole.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Role "{role_code}" not found'))
            self.stdout.write('\nAvailable roles:')
            for r in OrgRole.objects.all():
                self.stdout.write(f'  - {r.code}: {r.name_fa}')
            return

        self.stdout.write(self.style.SUCCESS(f'\nGranting VIEW permissions for role: {role.name_fa} ({role_code})\n'))

        granted = 0
        updated = 0
        skipped = 0

        for state in STATE_ORDER:
            perm, created = StatePermission.objects.get_or_create(
                state=state,
                permission_type=PermissionType.VIEW,
                role=role,
                defaults={
                    'is_active': True,
                    'restrict_to_own': restrict_to_own
                }
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Granted: {state}'))
                granted += 1
            else:
                if not perm.is_active:
                    perm.is_active = True
                    perm.restrict_to_own = restrict_to_own
                    perm.save()
                    self.stdout.write(self.style.WARNING(f'  ↻ Activated: {state}'))
                    updated += 1
                else:
                    self.stdout.write(f'  • Already exists: {state}')
                    skipped += 1

        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('Summary:'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}'))
        self.stdout.write(f'  ✓ Granted: {granted}')
        self.stdout.write(f'  ↻ Updated: {updated}')
        self.stdout.write(f'  • Skipped: {skipped}')
        self.stdout.write(f'  Total: {len(STATE_ORDER)} states\n')

        if restrict_to_own:
            self.stdout.write(self.style.WARNING('  ⚠ Note: restrict_to_own is enabled. Users can only see workflows they created.\n'))
