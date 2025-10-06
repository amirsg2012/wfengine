# Workflow System Architecture Analysis

**Date:** 2025-10-04
**Analysis Type:** System Verification Against Requirements

---

## 📋 Requirements (As Specified)

> A workflow is defined by default
> Users are defined with different organizational roles in the system
> A specific role can register a new request in the system
> A workflow is actually a state machine
> Each state of the workflow can consist of several steps
> Each state can be a form or a normal one
> If the state is not a form, each step means approval by a specific role
> If the state is a form, each step means filling out the form by a specific role or approving the information entered in the form
> For example, in a form that contains several sections, the first section is filled by a person with role X and another person (probably his manager) approves until all the steps of that state are completed.
> The accesses and roles required to enter a value in a form field or approve a step or the entire state should be configurable from the admin panel.

---

## ✅ Architecture Overview

### Dual System Implementation

The codebase implements **TWO parallel workflow systems**:

#### 1. **Legacy System** (Hardcoded)
- **Location:** `backend/apps/workflows/workflow_spec.py`, FSM transitions in `models.py`
- **States:** Hardcoded enum in `Workflow.State` (14 states)
- **Steps:** Defined in `ADVANCER_STEPS` dict
- **Transitions:** django-fsm decorators on Workflow model
- **Status:** ✅ Works but requires code changes

#### 2. **Configurable System** (Admin-Editable)
- **Location:** `backend/apps/workflows/models.py` (lines 23-350)
- **States:** `WorkflowTemplate`, `WorkflowState`, `WorkflowStateStep`
- **Transitions:** `WorkflowTransition` with condition logic
- **Status:** ✅ Implemented but not fully integrated

---

## 🔍 Detailed Analysis by Requirement

### ✅ Requirement 1: "A workflow is defined by default"

**CORRECT IMPLEMENTATION:**

**Models:**
- `WorkflowTemplate` (line 23-61): Defines workflow types (e.g., "Property Acquisition")
- `WorkflowState` (line 71-147): Defines states within a template
- Auto-assignment on workflow creation (models.py line 429-463)

**Evidence:**
```python
# models.py line 436-443
if not self.template:
    default_template = WorkflowTemplate.objects.filter(
        code='PROPERTY_ACQUISITION',
        is_active=True
    ).first()
```

**Admin Interface:**
- `/admin/workflows/workflowtemplate/` - Full CRUD for workflow definitions
- Inline state and transition editing

**✅ VERDICT:** CORRECTLY IMPLEMENTED

---

### ✅ Requirement 2: "Users with different organizational roles"

**CORRECT IMPLEMENTATION:**

**Models:**
- `OrgRoleGroup` (accounts app): Departments
- `OrgRole` (accounts app): Specific roles with codes
- `Membership` (accounts app): User-role associations

**Role Codes in Use:**
```python
# From workflow_spec.py
CEO_MANAGER, CEO_OFFICE_CHIEF
RE_MANAGER, RE_ACQUISITION_REGEN_LEAD, RE_VALUATION_LEASING_LEAD
LC_CONTRACTS_ASSEMBLIES_LEAD, LC_MANAGER
FA_ACCOUNTING_LEAD
```

**Management Command:**
- `bootstrap_org_roles` - Creates default roles

**✅ VERDICT:** CORRECTLY IMPLEMENTED

---

### ✅ Requirement 3: "A specific role can register new request"

**CORRECT IMPLEMENTATION:**

**Permission System:**
- `StatePermission` (permissions/models.py line 18-67): Controls state access
- Permission types: VIEW, EDIT, APPROVE, TRANSITION, DELETE
- Can be assigned to roles OR individual users

**Example:**
```python
# Only RE_VALUATION_LEASING_LEAD can create ApplicantRequest
StatePermission.objects.create(
    state='ApplicantRequest',
    permission_type='EDIT',
    role=OrgRole.objects.get(code='RE_VALUATION_LEASING_LEAD')
)
```

**API Integration:**
- Permission checks in `api/v1/views.py` via DRF permission classes
- `check_state_permission()` utility (permissions/utils.py line 27-88)

**✅ VERDICT:** CORRECTLY IMPLEMENTED

---

### ✅ Requirement 4: "Workflow is a state machine"

**CORRECT IMPLEMENTATION:**

**Legacy FSM:**
- Uses `django-fsm` library
- `FSMField` on Workflow model (models.py line 403)
- Protected transitions with `@transition` decorators (lines 564-614)
- Condition checking via `actions_ok()` (actions.py line 60-64)

**Configurable FSM:**
- `WorkflowTransition` model (models.py line 241-349)
- `TransitionConditionType` enum: ALWAYS, ALL_STEPS_APPROVED, ANY_STEP_APPROVED, FIELD_VALUE, CUSTOM_LOGIC
- `check_condition()` method (models.py line 308-349)
- State transition tracking in `completed_steps` JSON field

**Evidence:**
```python
# models.py line 701-743
def perform_configurable_transition(self, transition, by=None):
    """Perform a transition with proper state update and logging"""
    old_state = self.current_state
    self.current_state = transition.to_state
    # ... logging and validation
```

**✅ VERDICT:** CORRECTLY IMPLEMENTED (Both systems work)

---

### ✅ Requirement 5: "Each state can consist of several steps"

**CORRECT IMPLEMENTATION:**

**Model:**
- `WorkflowStateStep` (models.py line 149-229)

**Fields:**
- `step_number`: 0-based step index
- `required_role_code`: Role that can perform this step
- `requires_signature`: Boolean flag
- `signature_field_path`: JSON path to signature field
- `parallel_group`: For concurrent approvals

**Admin Interface:**
- Inline editing in `WorkflowStateAdmin`
- Shows all steps per state

**Step Tracking:**
- `Workflow.completed_steps` JSON field (models.py line 380-384)
- Structure: `{state_id: {step_num: {by, at, data}}}`

**Legacy System:**
- `ADVANCER_STEPS` dict in workflow_spec.py
- `current_step()` function in actions.py (line 9-28)

**✅ VERDICT:** CORRECTLY IMPLEMENTED

---

### ✅ Requirement 6: "State can be a form or normal one"

**CORRECT IMPLEMENTATION:**

**Model:**
- `StateType` enum (models.py line 63-68):
  - `FORM`: Requires form submission
  - `APPROVAL`: Only needs approval
  - `REVIEW`: Review/read-only
  - `AUTOMATIC`: Auto-transition

**Field:**
- `WorkflowState.state_type` (line 91-96)
- `WorkflowState.form_number` (line 97-101): Links to form when type=FORM

**Evidence:**
```python
# models.py line 91-96
state_type = models.CharField(
    max_length=32,
    choices=StateType.choices,
    default=StateType.APPROVAL,
    help_text="Type of state (form/approval/review/automatic)"
)
```

**✅ VERDICT:** CORRECTLY IMPLEMENTED

---

### ⚠️ Requirement 7: "Non-form state: each step = approval by role"

**PARTIAL IMPLEMENTATION:**

**What Works:**
- `StateStepPermission` model exists (permissions/models.py line 69-141)
- Links step to role: `role` ForeignKey (line 109-115)
- `check_state_step_permission()` utility (permissions/utils.py line 91-133)

**What's Broken:**
- `actions.py::perform_action()` still uses legacy `ADVANCER_STEPS` (line 99-100)
- Configurable system not prioritized in approval flow

**Current Code (actions.py line 99-107):**
```python
if action_type == Action.ActionType.APPROVE:
    state = workflow.state
    total = steps_required(state)  # ❌ Uses ADVANCER_STEPS
    idx = current_step(workflow)   # ❌ Uses ADVANCER_STEPS

    if not can_user_satisfy_step(user, state, idx):  # ❌ Legacy check
        return {"error": "forbidden", "needed_roles": step_roles(state, idx)}
```

**Should Be:**
```python
if workflow.is_configurable():
    # Check StateStepPermission instead
    if not check_state_step_permission(user, workflow, idx):
        return {"error": "forbidden"}
else:
    # Legacy workflow fallback
    ...
```

**⚠️ VERDICT:** PARTIALLY IMPLEMENTED - Models exist but not enforced

---

### ⚠️ Requirement 8: "Form state: each step = fill/approve by role"

**PARTIAL IMPLEMENTATION:**

**What Works:**
- `StateStepPermission.action_type` field (permissions/models.py line 85-94):
  - `FILL`: Fill section
  - `APPROVE`: Approve/sign section
- `StateStepPermission.section` field (line 78-84): Links step to form section
- `StateStepPermission.signature_field` (line 95-100): Path to signature field

**Example Working:**
```python
# Step 1: Fill legal report
StateStepPermission.objects.create(
    state='Form3',
    step=0,
    section='legalDeputyReport',
    action_type='FILL',
    role=OrgRole.objects.get(code='LC_CONTRACTS_ASSEMBLIES_LEAD')
)

# Step 2: Approve legal report
StateStepPermission.objects.create(
    state='Form3',
    step=1,
    section='legalDeputyReport',
    action_type='APPROVE',
    signature_field='legalDeputyReport.headOfContractsSignature',
    role=OrgRole.objects.get(code='LC_MANAGER')
)
```

**What's Broken:**
- Form3 has **hardcoded** 7-step approval in `forms/form_3.py` (line 14-62)
- `APPROVAL_STEPS` dict bypasses database configuration
- Cannot change Form3 steps from admin without code changes

**Form3 Hardcoded Steps:**
```python
# forms/form_3.py line 14-62
APPROVAL_STEPS = {
    1: {'role': 'LC_CONTRACTS_ASSEMBLIES_LEAD', 'section': 'legalDeputyReport', ...},
    2: {'role': 'LC_MANAGER', 'signature_field': 'headOfContractsSignature', ...},
    # ... 5 more hardcoded steps
}
```

**⚠️ VERDICT:** PARTIALLY IMPLEMENTED - Database models ready, hardcoded logic prevents admin config

---

### ⚠️ Requirement 9: "Admin-configurable field/step access"

**PARTIAL IMPLEMENTATION:**

**What's Configured:**

1. **State-Level Permissions** ✅
   - Admin: `/admin/permissions/statepermission/`
   - UI: Color-coded permission types
   - Works: Role/user assignment

2. **Step-Level Permissions** ✅
   - Admin: `/admin/permissions/statesteppermission/`
   - UI: Section and action type visible
   - Works: Role assignment with visual badges

3. **Form-Level Permissions** ✅
   - Admin: `/admin/permissions/formpermission/`
   - Works: Role-based form access

4. **Field-Level Permissions** ⚠️
   - Admin: `/admin/permissions/formfieldpermission/`
   - Model exists but **NOT enforced in API**
   - Frontend doesn't filter fields by permissions

**What's Missing:**

1. **API Integration:**
   - `WorkflowFormViewSet` doesn't call `filter_form_data_by_permissions()`
   - Frontend receives all fields regardless of user permissions
   - No field filtering in form schema endpoint

2. **Approval Logic:**
   - `perform_action()` doesn't check `StateStepPermission` for configurable workflows
   - Still uses hardcoded `ADVANCER_STEPS`

3. **Form3 Integration:**
   - Hardcoded logic ignores database permissions
   - Admin can configure permissions but they're not enforced

**⚠️ VERDICT:** PARTIALLY IMPLEMENTED - Admin UI exists, enforcement incomplete

---

## 🔧 Issues Found

### Issue #1: Legacy Code Takes Precedence

**Problem:**
```python
# actions.py line 30-37
def steps_required(state: str) -> int:
    if state == 'Form3':
        return _get_form3_total_steps()  # ❌ Hardcoded

    return len(ADVANCER_STEPS.get(state, []))  # ❌ Hardcoded
```

**Should Be:**
```python
def steps_required(workflow) -> int:
    if workflow.is_configurable():
        return workflow.current_state.get_required_steps_count()
    else:
        # Legacy fallback
        return len(ADVANCER_STEPS.get(workflow.state, []))
```

**Impact:**
- Admin-configured steps in `WorkflowStateStep` are **ignored**
- Changes to step requirements require code edits
- Cannot modify workflow behavior from admin panel

**Files Affected:**
- `/backend/apps/workflows/actions.py` (lines 9-49)
- `/backend/apps/workflows/forms/form_3.py` (lines 14-62)

---

### Issue #2: WorkflowStateStep Role Field is CharField

**Problem:**
```python
# models.py line 209-213
required_role_code = models.CharField(
    max_length=100,
    blank=True,
    help_text="Role code required to approve this step"
)
```

**Impact:**
- Admins must manually type role codes (error-prone)
- No dropdown/autocomplete for role selection
- No foreign key validation
- Typos cause permission failures

**Should Be:**
```python
required_role = models.ForeignKey(
    'accounts.OrgRole',
    on_delete=models.CASCADE,
    related_name='workflow_steps',
    help_text="Role required to approve this step"
)
```

---

### Issue #3: Field Permissions Not Enforced

**Problem:**
- `FormFieldPermission` model exists
- `filter_form_data_by_permissions()` utility exists (permissions/utils.py line 361-449)
- **But API doesn't use it**

**Current API Code:**
```python
# api/v1/views.py - WorkflowFormViewSet
def retrieve(self, request, pk=None):
    form_data = workflow.get_form_data(form_number)
    # ❌ No permission filtering
    return Response(form_data)
```

**Should Be:**
```python
def retrieve(self, request, pk=None):
    form_data = workflow.get_form_data(form_number)
    filtered_data = filter_form_data_by_permissions(
        user=request.user,
        form_number=form_number,
        form_data=form_data,
        state=workflow.state,
        workflow=workflow,
        permission_type=PermissionType.VIEW
    )
    return Response(filtered_data)
```

**Impact:**
- Users see fields they shouldn't access
- Security risk: unauthorized data exposure
- Admin-configured field permissions have no effect

---

### Issue #4: Form3 Completely Bypasses Configurable System

**Problem:**
Form3 has its own hardcoded permission system:

```python
# forms/form_3.py line 14-62
APPROVAL_STEPS = {
    1: {'role': 'LC_CONTRACTS_ASSEMBLIES_LEAD', 'action': 'fill_legal_report', 'section': 'legalDeputyReport'},
    2: {'role': 'LC_MANAGER', 'action': 'approve_legal_report', 'signature_field': 'headOfContractsSignature'},
    # ... 5 more steps
}
```

**Impact:**
- Cannot modify Form3 steps from admin
- Changing Form3 workflow requires code deployment
- Violates DRY principle (logic duplicated)
- Inconsistent with other forms

**Migration Needed:**
1. Create `StateStepPermission` records for Form3's 7 steps
2. Remove hardcoded `APPROVAL_STEPS` dict
3. Update `_perform_form3_approval()` to check `StateStepPermission`

---

## 📊 Implementation Scorecard

| Requirement | Implementation | Admin Configurable | Enforced | Score |
|-------------|----------------|-------------------|----------|-------|
| 1. Default workflow definition | ✅ WorkflowTemplate | ✅ Yes | ✅ Yes | 100% |
| 2. Organizational roles | ✅ OrgRole + Membership | ✅ Yes | ✅ Yes | 100% |
| 3. Role-based request creation | ✅ StatePermission | ✅ Yes | ✅ Yes | 100% |
| 4. State machine | ✅ FSM + Transitions | ✅ Yes | ✅ Yes | 100% |
| 5. Multi-step states | ✅ WorkflowStateStep | ✅ Yes | ⚠️ Partial | 70% |
| 6. Form vs approval states | ✅ StateType enum | ✅ Yes | ✅ Yes | 100% |
| 7. Non-form step approvals | ✅ StateStepPermission | ✅ Yes | ❌ No (legacy used) | 50% |
| 8. Form section fill/approve | ✅ StateStepPermission | ✅ Yes | ❌ No (Form3 hardcoded) | 40% |
| 9. Admin-configurable access | ✅ 4-level permissions | ✅ Yes | ⚠️ Partial | 60% |

**Overall Score: 80% (Excellent models, partial enforcement)**

---

## 🎯 Critical Fixes Needed

### Fix #1: Prioritize Configurable System in Actions (HIGH)

**File:** `/backend/apps/workflows/actions.py`

**Changes Needed:**

1. Update `current_step()`:
```python
def current_step(workflow) -> int:
    if workflow.is_configurable():
        # Get from WorkflowStateStep
        total_steps = workflow.current_state.steps.count()
        completed = workflow.completed_steps.get(str(workflow.current_state.id), {})
        return len(completed) if len(completed) < total_steps else total_steps

    # Legacy fallback
    if workflow.state == 'Form3':
        return _get_form3_current_step(workflow)
    # ... existing code
```

2. Update `steps_required()`:
```python
def steps_required(workflow) -> int:
    if workflow.is_configurable():
        return workflow.current_state.get_required_steps_count()

    # Legacy fallback
    return len(ADVANCER_STEPS.get(workflow.state, []))
```

3. Update `can_user_satisfy_step()`:
```python
def can_user_satisfy_step(user, workflow, step_idx) -> bool:
    if workflow.is_configurable():
        return check_state_step_permission(user, workflow, step_idx)

    # Legacy fallback
    required_roles = step_roles(workflow.state, step_idx)
    user_roles = set(user_role_codes(user))
    return len(user_roles & set(required_roles)) > 0
```

---

### Fix #2: Migrate Form3 to Database Configuration (HIGH)

**Steps:**

1. Create migration to populate `StateStepPermission`:
```python
# Migration
def populate_form3_steps(apps, schema_editor):
    StateStepPermission = apps.get_model('permissions', 'StateStepPermission')
    OrgRole = apps.get_model('accounts', 'OrgRole')

    steps = [
        {
            'step': 0, 'role': 'LC_CONTRACTS_ASSEMBLIES_LEAD',
            'section': 'legalDeputyReport', 'action_type': 'FILL',
            'description': 'تکمیل گزارش معاونت حقوقی'
        },
        {
            'step': 1, 'role': 'LC_MANAGER',
            'section': 'legalDeputyReport', 'action_type': 'APPROVE',
            'signature_field': 'legalDeputyReport.headOfContractsSignature',
            'description': 'تأیید گزارش حقوقی'
        },
        # ... 5 more steps
    ]

    for step_data in steps:
        role = OrgRole.objects.get(code=step_data['role'])
        StateStepPermission.objects.create(
            state='Form3',
            step=step_data['step'],
            role=role,
            section=step_data.get('section'),
            action_type=step_data.get('action_type'),
            signature_field=step_data.get('signature_field', ''),
            description=step_data['description']
        )
```

2. Remove hardcoded logic:
```python
# forms/form_3.py - DELETE APPROVAL_STEPS dict
# Use StateStepPermission.objects.filter(state='Form3').order_by('step') instead
```

---

### Fix #3: Add Field Permission Filtering to API (MEDIUM)

**File:** `/backend/api/v1/views.py`

**Add to WorkflowFormViewSet:**
```python
from apps.permissions.utils import filter_form_data_by_permissions
from apps.permissions.models import PermissionType

class WorkflowFormViewSet(viewsets.ViewSet):
    def retrieve(self, request, pk=None):
        workflow = get_object_or_404(Workflow, pk=pk)
        form_number = request.query_params.get('form_number')

        # Get raw form data
        form_data = workflow.get_form_data(form_number)

        # Filter by user permissions
        filtered_data = filter_form_data_by_permissions(
            user=request.user,
            form_number=int(form_number),
            form_data=form_data,
            state=workflow.state,
            workflow=workflow,
            permission_type=PermissionType.VIEW
        )

        return Response(filtered_data)

    def submit(self, request, pk=None):
        workflow = get_object_or_404(Workflow, pk=pk)
        form_number = request.data.get('form_number')
        form_data = request.data.get('data')

        # Filter editable fields
        editable_data = filter_form_data_by_permissions(
            user=request.user,
            form_number=int(form_number),
            form_data=form_data,
            state=workflow.state,
            workflow=workflow,
            permission_type=PermissionType.EDIT
        )

        # Only save fields user can edit
        workflow.update_from_form(form_number, editable_data)
        return Response({'status': 'success'})
```

---

### Fix #4: Convert WorkflowStateStep Role to ForeignKey (LOW)

**File:** `/backend/apps/workflows/models.py`

**Migration:**
```python
# New migration
class Migration(migrations.Migration):
    dependencies = [
        ('workflows', '0003_...'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflowstatestep',
            name='required_role',
            field=models.ForeignKey(
                'accounts.OrgRole',
                on_delete=models.CASCADE,
                null=True,
                blank=True
            ),
        ),
        # Data migration: populate required_role from required_role_code
        migrations.RunPython(migrate_role_codes),
        # Remove old field
        migrations.RemoveField('workflowstatestep', 'required_role_code'),
    ]
```

**Admin Update:**
```python
# admin.py
class WorkflowStateStepAdmin(admin.ModelAdmin):
    fields = ['state', 'step_number', 'name_fa', 'required_role', ...]
    # Now shows dropdown instead of text input
```

---

## ✅ What's Working Well

1. **Excellent Model Design**
   - Clean separation of concerns
   - Proper use of ForeignKeys and relationships
   - JSON fields for flexible data storage

2. **Comprehensive Admin Interface**
   - Inline editing for related models
   - Color-coded permission display
   - Good use of fieldsets and help text

3. **Permission Utility Functions**
   - Well-documented helper functions
   - Proper caching and query optimization
   - Support for both role and user-based permissions

4. **Dual System Compatibility**
   - Legacy workflows still work
   - New workflows use configurable system
   - Gradual migration path possible

---

## 📝 Summary

**Architecture Quality:** ⭐⭐⭐⭐⭐ (5/5)
- Excellent database design
- Proper separation of concerns
- Scalable and maintainable

**Implementation Completeness:** ⭐⭐⭐⭐☆ (4/5)
- Models: 100% complete
- Admin UI: 100% complete
- Business logic: 60% integrated
- API enforcement: 50% complete

**Admin Configurability:** ⭐⭐⭐☆☆ (3/5)
- Can configure: States, transitions, permissions
- Cannot configure: Form3 steps (hardcoded)
- Partial: Field permissions (not enforced)

**Main Issue:**
The configurable system exists but **legacy hardcoded logic takes precedence**. The fix is straightforward: update `actions.py` and `form_3.py` to check database permissions first, fallback to legacy only for old workflows.

**Recommended Action:**
1. Apply Fix #1 (actions.py priority) - 2 hours
2. Apply Fix #2 (Form3 migration) - 4 hours
3. Apply Fix #3 (API filtering) - 3 hours
4. Apply Fix #4 (Role FK) - 1 hour

**Total Effort:** ~10 hours to achieve 100% admin configurability

---

*End of Analysis*
