# apps/accounts/management/commands/bootstrap_org_roles.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import OrgRoleGroup, OrgRole, Membership

User = get_user_model()

GROUPS = [
    {"code": "CEO", "name_fa": "مدیر عامل"},
    {"code": "RE",  "name_fa": "معاونت املاک"},
    {"code": "LC",  "name_fa": "معاونت حقوقی و امور قراردادها"},
    {"code": "FA",  "name_fa": "معاونت مالی و اداری"},
]

ROLES = [
    # CEO
    {"code": "CEO_MANAGER",        "name_fa": "مدیرعامل",                         "group": "CEO"},
    {"code": "CEO_OFFICE_CHIEF",   "name_fa": "رئیس دفتر مدیرعامل",               "group": "CEO"},
    # RE
    {"code": "RE_MANAGER",                 "name_fa": "معاونت املاک",                        "group": "RE"},
    {"code": "RE_ACQUISITION_REGEN_LEAD", "name_fa": "مدیریت تملیک و مولدسازی",             "group": "RE"},
    {"code": "RE_VALUATION_LEASING_LEAD", "name_fa": "مدیریت ارزیابی و اجاره داری",         "group": "RE"},
    {"code": "RE_TECH_URBANISM_LEAD",     "name_fa": "مدیریت فنی و شهرسازی",                "group": "RE"},
    {"code": "RE_ACQUISITION_REGEN_EXPERT","name_fa":"کارشناس تملیک و مولدسازی",            "group": "RE"},
    # LC
    {"code": "LC_MANAGER",                 "name_fa": "معاونت حقوقی و امور قراردادها",      "group": "LC"},
    {"code": "LC_CONTRACTS_ASSEMBLIES_LEAD","name_fa":"مدیریت امور قرارداد ها و مجامع",    "group": "LC"},
    # FA
    {"code": "FA_MANAGER",          "name_fa": "معاونت مالی و اداری",               "group": "FA"},
    {"code": "FA_ACCOUNTING_LEAD",  "name_fa": "مدیریت حسابداری",                   "group": "FA"},
    {"code": "FA_FINANCE_LEAD",     "name_fa": "مدیریت مالی",                       "group": "FA"},
]

class Command(BaseCommand):
    help = "Seed org role groups and roles. Optional: --with-demo-users to create demo accounts & memberships."

    def add_arguments(self, parser):
        parser.add_argument("--with-demo-users", action="store_true", help="Create demo users & memberships")

    def handle(self, *args, **opts):
        # Groups
        code_to_group = {}
        for g in GROUPS:
            grp, _ = OrgRoleGroup.objects.get_or_create(code=g["code"], defaults={"name_fa": g["name_fa"]})
            if grp.name_fa != g["name_fa"]:
                grp.name_fa = g["name_fa"]
                grp.save(update_fields=["name_fa"])
            code_to_group[g["code"]] = grp

        # Roles
        code_to_role = {}
        for r in ROLES:
            grp = code_to_group[r["group"]]
            role, _ = OrgRole.objects.get_or_create(code=r["code"], defaults={"name_fa": r["name_fa"], "group": grp})
            changed = False
            if role.name_fa != r["name_fa"]:
                role.name_fa = r["name_fa"]; changed = True
            if role.group_id != grp.id:
                role.group = grp; changed = True
            if changed:
                role.save()
            code_to_role[r["code"]] = role

        self.stdout.write(self.style.SUCCESS(f"Seeded {len(GROUPS)} groups, {len(ROLES)} roles."))

        if not opts["with_demo_users"]:
            return

        # Minimal demo users (DEV ONLY)
        demo = [
            ("ceo",                    "CEO_MANAGER"),
            ("ceo_office",             "CEO_OFFICE_CHIEF"),
            ("re_val_lead",            "RE_VALUATION_LEASING_LEAD"),
            ("re_acq_expert",          "RE_ACQUISITION_REGEN_EXPERT"),
            ("re_acq_lead",            "RE_ACQUISITION_REGEN_LEAD"),
            ("re_tech_lead",           "RE_TECH_URBANISM_LEAD"),
            ("re_manager",             "RE_MANAGER"),
            ("lc_contracts_lead",      "LC_CONTRACTS_ASSEMBLIES_LEAD"),
            ("fa_accounting_lead",     "FA_ACCOUNTING_LEAD"),
        ]
        for username, role_code in demo:
            user, created = User.objects.get_or_create(username=username, defaults={"is_staff": True})
            if created:
                user.set_password("pass1234")
                user.save()
            Membership.objects.get_or_create(user=user, role=code_to_role[role_code])

        self.stdout.write(self.style.SUCCESS("Demo users created (password: pass1234)."))
