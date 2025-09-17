# backend/apps/accounts/management/commands/create_admin_user.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import OrgRoleGroup, OrgRole, Membership

User = get_user_model()

class Command(BaseCommand):
    help = "Create an admin user with admin privileges for testing the admin panel"

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin", help="Username for admin user")
        parser.add_argument("--password", default="admin123", help="Password for admin user")
        parser.add_argument("--email", default="admin@workflow.local", help="Email for admin user")

    def handle(self, *args, **opts):
        username = opts["username"]
        password = opts["password"]
        email = opts["email"]

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            existing_user = User.objects.get(username=username)
            existing_user.is_superuser = True
            existing_user.is_staff = True
            existing_user.save()
            self.stdout.write(
                self.style.SUCCESS(f"Updated existing user '{username}' with admin privileges")
            )
            return

        # Create admin user
        admin_user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name="\u0645\u062f\u06cc\u0631",
            last_name="\u0633\u06cc\u0633\u062a\u0645",
            is_staff=True,
            is_superuser=True
        )

        # Create ADMIN role group if it doesn't exist
        admin_group, created = OrgRoleGroup.objects.get_or_create(
            code="ADMIN",
            defaults={"name_fa": "\u0645\u062f\u06cc\u0631\u06cc\u062a \u0633\u06cc\u0633\u062a\u0645"}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS("Created ADMIN role group"))

        # Create ADMIN role if it doesn't exist
        admin_role, created = OrgRole.objects.get_or_create(
            code="ADMIN",
            defaults={
                "name_fa": "\u0645\u062f\u06cc\u0631 \u0633\u06cc\u0633\u062a\u0645", 
                "group": admin_group
            }
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS("Created ADMIN role"))

        # Assign ADMIN role to user
        Membership.objects.get_or_create(
            user=admin_user,
            role=admin_role
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created admin user:\n"
                f"  Username: {username}\n"
                f"  Password: {password}\n"
                f"  Email: {email}\n"
                f"  Admin Panel: http://localhost:3000/admin\n"
                f"  Is Superuser: True\n"
                f"  Has ADMIN role: True"
            )
        )