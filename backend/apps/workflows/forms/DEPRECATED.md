# DEPRECATED: Legacy Form System

**Date:** 2025-10-04
**Status:** DEPRECATED - Use DynamicForms instead

---

## ⚠️ This Directory is Deprecated

All legacy hardcoded forms have been migrated to the **DynamicForm** system in the database.

### What Changed:

**OLD (Deprecated):**
- Forms hardcoded in Python files (`form_1.py`, `form_2.py`, `form_3.py`)
- Form registry system
- Schema defined in code
- Requires code deployment to change forms

**NEW (Use This):**
- Forms stored in database (`DynamicForm`, `FormSection`, `FormField` models)
- Fully admin-configurable at `/admin/workflows/dynamicform/`
- Schema generated from database
- No code deployment needed to change forms

---

## Migration Status

✅ **Completed:** All 3 legacy forms migrated to database

| Form | Title | Sections | Fields | Status |
|------|-------|----------|--------|--------|
| 1 | Specifications and Document Submission Form | 5 | 24 | ✅ Migrated |
| 2 | Client Undertaking Form | 3 | 15 | ✅ Migrated |
| 3 | Property Status Review | 4 | 43 | ✅ Migrated |

---

## How to Use DynamicForms

### Admin Panel:
1. Go to `/admin/workflows/dynamicform/`
2. Click on a form to edit
3. Add/edit sections and fields
4. Changes are immediately active

### API:
```python
from apps.workflows.models_dynamic_forms import DynamicForm

# Get form
form = DynamicForm.objects.get(form_number=1, is_active=True)

# Get schema
schema = form.get_schema()

# Get sections
sections = form.sections.all()

# Get fields
fields = form.fields.all()
```

### Management Command:
```bash
# Migrate legacy forms to database
python manage.py migrate_legacy_forms_to_dynamic

# Clear and re-migrate
python manage.py migrate_legacy_forms_to_dynamic --clear
```

---

## Files in This Directory

### Deprecated Files (Keep for Reference Only):
- `form_1.py` - ❌ DEPRECATED
- `form_2.py` - ❌ DEPRECATED
- `form_3.py` - ⚠️ PARTIALLY DEPRECATED (step logic migrated to StateStepPermission)
- `form_3_helpers.py` - ❌ DEPRECATED
- `form_3_permissions.py` - ❌ DEPRECATED
- `base.py` - ❌ DEPRECATED
- `registry.py` - ⚠️ DEPRECATED (use DynamicForm.objects instead)

### What to Keep:
- `__init__.py` - Needed for Python module
- `DEPRECATED.md` - This file (documentation)

---

## For Developers

### Don't Use:
```python
# ❌ OLD WAY (Deprecated)
from apps.workflows.forms.registry import FormRegistry
form = FormRegistry.get_form(1)
schema = form.get_schema()
```

### Use Instead:
```python
# ✅ NEW WAY (Recommended)
from apps.workflows.models_dynamic_forms import DynamicForm
form = DynamicForm.objects.get(form_number=1, is_active=True)
schema = form.get_schema()
```

### Backward Compatibility:
The old `FormRegistry` still works but returns `None` when `_use_dynamic_forms = True` (default).

To temporarily use legacy forms (not recommended):
```python
FormRegistry.set_dynamic_forms_enabled(False)
```

---

## Removal Plan

### Phase 1: ✅ DONE (2025-10-04)
- [x] Create DynamicForm models
- [x] Create migration command
- [x] Migrate all 3 forms to database
- [x] Mark files as deprecated

### Phase 2: 🚧 TODO
- [ ] Update all code to use DynamicForm
- [ ] Remove FormRegistry usage
- [ ] Add deprecation warnings to old code

### Phase 3: 🗓️ FUTURE
- [ ] Delete deprecated files
- [ ] Remove FormRegistry
- [ ] Clean up imports

---

## Questions?

- **Where are forms now?** → Database tables: `dynamicform`, `formsection`, `formfield`
- **How to edit forms?** → Django Admin at `/admin/workflows/dynamicform/`
- **How to create new forms?** → Add via admin panel, no code needed
- **Are old forms still working?** → Yes, but deprecated. Use DynamicForms instead.
- **When will old files be deleted?** → After Phase 2 is complete (TBD)

---

*Last Updated: 2025-10-04*
*System: DynamicForm (Database-Driven Forms)*
