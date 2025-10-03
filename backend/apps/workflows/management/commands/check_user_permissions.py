# apps/workflows/management/commands/check_user_permissions.py
"""
Management command to check and diagnose user permissions
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.permissions.models import StatePermission, StateStepPermission, FormPermission, PermissionType
from apps.accounts.models import Membership
from apps.workflows.models import Workflow

User = get_user_model()


class Command(BaseCommand):
    help = 'Check permissions for a user and optionally grant VIEW permissions to all states'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username to check')
        parser.add_argument(
            '--grant-view-all',
            action='store_true',
            help='Grant VIEW permission to all workflow states for this user\'s roles'
        )

    def handle(self, *args, **options):
        username = options['username']
        grant_view = options.get('grant_view_all', False)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User "{username}" not found'))
            return

        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS(f'Permissions Report for: {username}'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))

        # User info
        self.stdout.write(self.style.WARNING('User Information:'))
        self.stdout.write(f'  Username: {user.username}')
        self.stdout.write(f'  Full Name: {user.first_name} {user.last_name}')
        self.stdout.write(f'  Email: {user.email}')
        self.stdout.write(f'  Is Superuser: {user.is_superuser}')
        self.stdout.write(f'  Is Active: {user.is_active}\n')

        # User's roles
        memberships = Membership.objects.filter(user=user).select_related('role', 'role__group')
        self.stdout.write(self.style.WARNING('Assigned Roles:'))
        if memberships:
            for m in memberships:
                self.stdout.write(f'  ✓ {m.role.code}: {m.role.name_fa} (Group: {m.role.group.name_fa})')
        else:
            self.stdout.write(self.style.ERROR('  ✗ No roles assigned!'))

        role_codes = [m.role.code for m in memberships]

        # User's direct permissions
        self.stdout.write(self.style.WARNING('\nDirect State Permissions (assigned to user):'))
        user_perms = StatePermission.objects.filter(user=user, is_active=True).order_by('state', 'permission_type')
        if user_perms:
            for p in user_perms:
                restrict = ' [RESTRICT_TO_OWN]' if p.restrict_to_own else ''
                self.stdout.write(f'  ✓ {p.state}: {p.permission_type}{restrict}')
        else:
            self.stdout.write('  (None)')

        # Role-based state permissions
        self.stdout.write(self.style.WARNING('\nRole-Based State Permissions:'))
        role_perms = StatePermission.objects.filter(
            role__code__in=role_codes,
            is_active=True
        ).select_related('role').order_by('state', 'permission_type')

        if role_perms:
            for p in role_perms:
                restrict = ' [RESTRICT_TO_OWN]' if p.restrict_to_own else ''
                self.stdout.write(f'  ✓ {p.state}: {p.permission_type} (via {p.role.code}){restrict}')
        else:
            self.stdout.write(self.style.ERROR('  ✗ No role-based state permissions!'))

        # Step permissions
        self.stdout.write(self.style.WARNING('\nStep Permissions:'))
        step_perms = StateStepPermission.objects.filter(
            role__code__in=role_codes,
            is_active=True
        ).select_related('role').order_by('state', 'step')

        if step_perms:
            for p in step_perms:
                self.stdout.write(f'  ✓ {p.state} - Step {p.step + 1}: via {p.role.code}')
        else:
            self.stdout.write('  (None)')

        # Form permissions
        self.stdout.write(self.style.WARNING('\nForm Permissions:'))
        form_perms = FormPermission.objects.filter(
            role__code__in=role_codes,
            is_active=True
        ).select_related('role').order_by('form_number', 'permission_type')

        if form_perms:
            for p in form_perms:
                state_info = f' [State: {p.state}]' if p.state else ' [All States]'
                self.stdout.write(f'  ✓ Form {p.form_number}: {p.permission_type} (via {p.role.code}){state_info}')
        else:
            self.stdout.write('  (None)')

        # Summary
        view_states = set()
        edit_states = set()
        approve_states = set()

        for p in user_perms:
            if p.permission_type == PermissionType.VIEW:
                view_states.add(p.state)
            elif p.permission_type == PermissionType.EDIT:
                edit_states.add(p.state)
            elif p.permission_type == PermissionType.APPROVE:
                approve_states.add(p.state)

        for p in role_perms:
            if p.permission_type == PermissionType.VIEW:
                view_states.add(p.state)
            elif p.permission_type == PermissionType.EDIT:
                edit_states.add(p.state)
            elif p.permission_type == PermissionType.APPROVE:
                approve_states.add(p.state)

        self.stdout.write(self.style.SUCCESS(f'\n{"="*60}'))
        self.stdout.write(self.style.SUCCESS('SUMMARY:'))
        self.stdout.write(self.style.SUCCESS(f'{"="*60}'))
        self.stdout.write(f'  Can VIEW workflows in: {len(view_states)} states')
        if view_states:
            self.stdout.write(f'    → {", ".join(sorted(view_states)[:5])}{"..." if len(view_states) > 5 else ""}')
        else:
            self.stdout.write(self.style.ERROR('    → NONE! User cannot see any workflows!'))

        self.stdout.write(f'  Can EDIT workflows in: {len(edit_states)} states')
        self.stdout.write(f'  Can APPROVE workflows in: {len(approve_states)} states')

        # Count workflows user can see
        from apps.permissions.utils import get_user_roles

        user_roles_set = get_user_roles(user)

        # Get states where user has VIEW permission
        user_view_all_states = set()
        user_view_own_states = set()

        user_direct_perms = StatePermission.objects.filter(
            permission_type=PermissionType.VIEW,
            user=user,
            is_active=True
        ).values_list('state', 'restrict_to_own')

        for state, restrict_to_own in user_direct_perms:
            if restrict_to_own:
                user_view_own_states.add(state)
            else:
                user_view_all_states.add(state)

        if user_roles_set:
            role_view_perms = StatePermission.objects.filter(
                permission_type=PermissionType.VIEW,
                role__code__in=user_roles_set,
                is_active=True
            ).values_list('state', 'restrict_to_own')

            for state, restrict_to_own in role_view_perms:
                if restrict_to_own:
                    user_view_own_states.add(state)
                else:
                    user_view_all_states.add(state)

        # Count visible workflows
        from django.db.models import Q
        q_objects = Q()
        if user_view_all_states:
            q_objects |= Q(state__in=user_view_all_states)
        if user_view_own_states:
            q_objects |= Q(state__in=user_view_own_states, created_by=user)

        if q_objects:
            visible_count = Workflow.objects.filter(q_objects).count()
        else:
            visible_count = 0

        total_workflows = Workflow.objects.count()

        self.stdout.write(f'\n  Total workflows in system: {total_workflows}')
        self.stdout.write(f'  Workflows visible to {username}: {visible_count}')

        if visible_count == 0 and total_workflows > 0:
            self.stdout.write(self.style.ERROR('\n  ⚠ WARNING: User has no visible workflows!'))

        # Grant VIEW permissions if requested
        if grant_view and memberships:
            self.stdout.write(self.style.WARNING(f'\n{"="*60}'))
            self.stdout.write(self.style.WARNING('GRANTING VIEW PERMISSIONS TO ALL STATES...'))
            self.stdout.write(self.style.WARNING(f'{"="*60}\n'))

            from apps.workflows.workflow_spec import STATE_ORDER

            granted_count = 0
            for m in memberships:
                role = m.role
                for state in STATE_ORDER:
                    perm, created = StatePermission.objects.get_or_create(
                        state=state,
                        permission_type=PermissionType.VIEW,
                        role=role,
                        defaults={'is_active': True, 'restrict_to_own': False}
                    )
                    if created:
                        self.stdout.write(f'  ✓ Granted {state} VIEW to {role.code}')
                        granted_count += 1
                    else:
                        if not perm.is_active:
                            perm.is_active = True
                            perm.save()
                            self.stdout.write(f'  ✓ Activated {state} VIEW for {role.code}')
                            granted_count += 1

            self.stdout.write(self.style.SUCCESS(f'\n✓ Granted/activated {granted_count} VIEW permissions!'))
            self.stdout.write(self.style.SUCCESS('User should now be able to see workflows.\n'))

        elif grant_view and not memberships:
            self.stdout.write(self.style.ERROR('\n✗ Cannot grant permissions: User has no roles assigned!'))
            self.stdout.write('  First assign roles to the user, then run with --grant-view-all\n')

        self.stdout.write(self.style.SUCCESS(f'{"="*60}\n'))
