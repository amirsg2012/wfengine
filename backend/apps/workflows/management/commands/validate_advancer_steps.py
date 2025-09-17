# apps/letters/management/commands/validate_advancer_steps.py
from django.core.management.base import BaseCommand, CommandError
from apps.accounts.models import OrgRole
from apps.workflows.workflow_spec import ADVANCER_STEPS, STATE_ORDER

class Command(BaseCommand):
    help = "Validate that every role code in ADVANCER_STEPS exists in OrgRole."

    def handle(self, *args, **kwargs):
        role_codes = set(OrgRole.objects.values_list("code", flat=True))
        missing = set()
        for state in STATE_ORDER:
            steps = ADVANCER_STEPS.get(state, [])
            for step in steps:
                for code in step:
                    if code not in role_codes:
                        missing.add(code)
        if missing:
            self.stdout.write(self.style.ERROR("Missing role codes: " + ", ".join(sorted(missing))))
            raise CommandError("Validation failed.")
        self.stdout.write(self.style.SUCCESS("ADVANCER_STEPS validation passed."))
