# backend/apps/workflows/tests/test_permissions.py
"""
Permission system integration tests
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.workflows.models import WorkflowTemplate, WorkflowState, Workflow
from apps.accounts.models import OrgRole, OrgRoleGroup, Membership
from apps.permissions.models import StatePermission, PermissionType
from apps.permissions.utils import check_state_permission

User = get_user_model()


class StatePermissionTest(TestCase):
    """Test state-level permissions"""

    def setUp(self):
        # Create users
        self.user1 = User.objects.create_user(
            username='user1',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            password='pass123'
        )

        # Create role
        group = OrgRoleGroup.objects.create(
            code='TEST_GROUP',
            name_fa='گروه تست'
        )
        self.role = OrgRole.objects.create(
            code='MANAGER',
            name_fa='مدیر',
            group=group
        )

        # Assign role to user1 only
        Membership.objects.create(user=self.user1, role=self.role)

        # Create template and state
        self.template = WorkflowTemplate.objects.create(
            code='TEST',
            name='Test',
            name_fa='تست',
            created_by=self.user1
        )
        self.state = WorkflowState.objects.create(
            template=self.template,
            code='TEST_STATE',
            name='Test State',
            name_fa='وضعیت تست',
            order=1
        )

        # Create workflow
        self.workflow = Workflow.objects.create(
            title='Test',
            created_by=self.user1,
            template=self.template,
            current_state=self.state
        )

    def test_user_with_role_permission_can_view(self):
        """Test user with role permission can view workflow"""
        # Grant VIEW permission to role
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.VIEW,
            role=self.role,
            is_active=True
        )

        # User1 (has role) should have permission
        self.assertTrue(
            check_state_permission(self.user1, self.workflow, PermissionType.VIEW)
        )

    def test_user_without_role_permission_cannot_view(self):
        """Test user without role permission cannot view workflow"""
        # Grant VIEW permission to role
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.VIEW,
            role=self.role,
            is_active=True
        )

        # User2 (no role) should NOT have permission
        self.assertFalse(
            check_state_permission(self.user2, self.workflow, PermissionType.VIEW)
        )

    def test_user_specific_permission(self):
        """Test user-specific permission overrides role permission"""
        # Grant VIEW permission directly to user2
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.VIEW,
            user=self.user2,
            is_active=True
        )

        # User2 should have permission even without role
        self.assertTrue(
            check_state_permission(self.user2, self.workflow, PermissionType.VIEW)
        )

    def test_restrict_to_own_permission(self):
        """Test restrict_to_own limits access to creator"""
        # Grant VIEW permission to role with restrict_to_own
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.VIEW,
            role=self.role,
            restrict_to_own=True,
            is_active=True
        )

        # Create workflow by user2
        other_workflow = Workflow.objects.create(
            title='Other',
            created_by=self.user2,
            template=self.template,
            current_state=self.state
        )

        # User1 should see own workflow
        self.assertTrue(
            check_state_permission(self.user1, self.workflow, PermissionType.VIEW)
        )

        # User1 should NOT see other's workflow
        self.assertFalse(
            check_state_permission(self.user1, other_workflow, PermissionType.VIEW)
        )

    def test_inactive_permission_not_granted(self):
        """Test inactive permissions are not granted"""
        # Grant VIEW permission but set inactive
        StatePermission.objects.create(
            state=self.state,
            permission_type=PermissionType.VIEW,
            role=self.role,
            is_active=False  # Inactive!
        )

        # User1 should NOT have permission
        self.assertFalse(
            check_state_permission(self.user1, self.workflow, PermissionType.VIEW)
        )

    def test_superuser_has_all_permissions(self):
        """Test superuser bypasses permission checks"""
        superuser = User.objects.create_superuser(
            username='admin',
            password='admin123',
            email='admin@test.com'
        )

        # No permissions granted, but superuser should still have access
        self.assertTrue(
            check_state_permission(superuser, self.workflow, PermissionType.VIEW)
        )
        self.assertTrue(
            check_state_permission(superuser, self.workflow, PermissionType.EDIT)
        )
        self.assertTrue(
            check_state_permission(superuser, self.workflow, PermissionType.APPROVE)
        )
