# apps/accounts/utils.py
from .models import Membership

def user_role_codes(user) -> set[str]:
    if not user.is_authenticated:
        return set()
    return set(Membership.objects.filter(user=user).values_list("role__code", flat=True))
