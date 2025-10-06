# backend/apps/accounts/management/commands/generate_signature_hashes.py
"""
Management command to generate unique signature hashes for all users
"""
import hashlib
import uuid
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate unique signature hashes for all users who don\'t have one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--regenerate',
            action='store_true',
            help='Regenerate hashes for all users (even those who already have one)'
        )

    def handle(self, *args, **options):
        regenerate = options.get('regenerate', False)

        users = User.objects.all()
        updated_count = 0
        skipped_count = 0

        for user in users:
            # Check if user already has a signature hash
            if hasattr(user, 'signature_hash') and user.signature_hash and not regenerate:
                self.stdout.write(f"  Skipping {user.username} (already has hash)")
                skipped_count += 1
                continue

            # Generate unique signature hash based on user ID and UUID
            unique_string = f"{user.id}-{user.username}-{uuid.uuid4()}"
            signature_hash = hashlib.sha256(unique_string.encode()).hexdigest()

            # Save to user
            if not hasattr(User, 'signature_hash'):
                self.stdout.write(self.style.ERROR(
                    "User model doesn't have 'signature_hash' field. "
                    "Please run migrations first."
                ))
                return

            user.signature_hash = signature_hash
            user.save(update_fields=['signature_hash'])

            self.stdout.write(self.style.SUCCESS(
                f"  Generated hash for {user.username}: {signature_hash[:16]}..."
            ))
            updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"\n✅ Generated signature hashes for {updated_count} users"
        ))
        if skipped_count > 0:
            self.stdout.write(f"   Skipped {skipped_count} users (already had hashes)")
