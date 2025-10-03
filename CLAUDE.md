# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Workflow Management System** for document processing and approval workflows, built as a monorepo with:
- **Backend**: Django REST Framework with MongoDB and MinIO for file storage
- **Frontend**: React with Vite, TailwindCSS, and React Router

The system manages multi-stage approval workflows with role-based permissions, FSM (Finite State Machine) transitions, and complex form processing.

## Common Development Commands

### Frontend (React + Vite)
```bash
# Development server
npm run dev:frontend

# Build for production
npm run build -w frontend

# Lint with auto-fix
npm run lint:fix -w frontend

# Type checking
npm run type-check -w frontend

# Clean build artifacts
npm run clean -w frontend
```

### Backend (Django)
```bash
# Development server (from backend directory or root)
pipenv run python backend/manage.py runserver
# OR from root:
npm run dev:backend

# Create migrations
pipenv run python backend/manage.py makemigrations

# Apply migrations
pipenv run python backend/manage.py migrate

# Create admin user
pipenv run python backend/manage.py create_admin_user

# Bootstrap organization roles
pipenv run python backend/manage.py bootstrap_org_roles

# Bootstrap permissions (run after bootstrap_org_roles)
pipenv run python backend/manage.py bootstrap_permissions

# Clear and re-bootstrap permissions
pipenv run python backend/manage.py bootstrap_permissions --clear

# Validate workflow advancer steps
pipenv run python backend/manage.py validate_advancer_steps

# Django shell
pipenv run python backend/manage.py shell

# Run tests
pipenv run python backend/manage.py test
```

### Docker Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Stop containers
docker-compose -f docker-compose.dev.yml down

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build
```

## Architecture Overview

### Backend Structure

**Centralized API Organization** (`backend/api/`):
- **All APIs consolidated** in `backend/api/v1/` directory
- `api/v1/views.py`: All ViewSets (Workflow, Form, Attachment, etc.)
- `api/v1/serializers.py`: All DRF serializers
- `api/v1/urls.py`: Centralized URL configuration
- `api/permissions/`: DRF permission classes for fine-grained access control

**Core App: `apps/workflows`**
- **FSM-based state transitions**: Uses `django-fsm` for workflow state management
- **Workflow states defined in**: `backend/apps/workflows/models.py` (State enum)
- **State transition rules**: `backend/apps/workflows/workflow_spec.py`
  - `STATE_ORDER`: Linear progression through workflow stages
  - `ADVANCER_STEPS`: Role-based approval requirements for each state
  - `NEXT_STATE`: Mapping of current state to next state

**Permission System** (`apps/permissions/`):
- **Multi-level permission control**: state, step, form, and field-level permissions
- **Role and user-based**: Permissions can be assigned to roles or individual users
- **Permission Override**: Temporary workflow-specific permission grants
- **Models**: StatePermission, StateStepPermission, FormPermission, FormFieldPermission, PermissionOverride
- **Utilities**: `apps/permissions/utils.py` provides permission checking functions
- **Bootstrap command**: `python manage.py bootstrap_permissions` sets up default permissions

**Key Backend Patterns:**

1. **Workflow Model** (`apps/workflows/models.py`):
   - Uses `FSMField` for state management with protected transitions
   - Stores flexible form data in `_data` TextField as JSON
   - Property accessors extract common fields from nested JSON structure
   - `advance_to_next_state()` method dynamically calls the appropriate transition method

2. **Form Registry System** (`apps/workflows/forms/`):
   - `registry.py`: Central registry for all workflow forms
   - `base.py`: Base class defining form schema interface
   - `form_1.py`, `form_2.py`, `form_3.py`: Specific form implementations
   - `form_3_permissions.py`: Complex permission logic for Form3's multi-step approval
   - Forms use `@register_form` decorator for auto-registration

3. **Action/Approval System** (`apps/workflows/actions.py`):
   - `current_step()`: Calculates next required approval step
   - `steps_required()`: Returns total approvals needed for a state
   - `step_roles()`: Returns roles allowed to approve a specific step
   - `perform_action()`: Handles approvals with role validation and concurrency protection
   - **Form3 special handling**: 7-step sequential approval process with role-specific sections

4. **MongoDB Integration**:
   - Uses `django-mongodb-backend` as database engine
   - Custom migrations in `backend/mongo_migrations/`
   - Custom JSON encoder in `workflow_engine/encoders.py` for MongoDB ObjectId serialization
   - DRF integration via `workflow_engine/drf_mongo.py`

5. **File Storage**:
   - MinIO via `django-storages` with S3-compatible API
   - Attachments stored in `Attachment` model with S3Boto3Storage backend
   - Configuration in `settings.py` under AWS_* variables

### Frontend Structure

**Routing** (`frontend/src/App.jsx`):
- React Router with protected routes
- Auth state management via `AuthProvider` context
- Admin routes separated with `AdminRoute` wrapper component

**Key Frontend Patterns:**

1. **API Client** (`frontend/src/api/client.js`):
   - Axios instance with JWT authentication
   - Automatic token refresh handling
   - Interceptors for auth errors and redirects

2. **Authentication** (`frontend/src/api/useAuth.jsx`):
   - Context-based auth state management
   - JWT token storage in localStorage
   - Auto-refresh on app load

3. **Pages Structure**:
   - `Dashboard.jsx`: User inbox showing pending workflows
   - `WorkflowList.jsx`: Browse and filter all workflows
   - `WorkflowCreate.jsx`: Initialize new workflow
   - `WorkflowDetail.jsx`: View/edit workflow with state-specific forms
   - `admin/`: Admin-only pages for user and system management

4. **Components**:
   - `forms/`: Dynamic form components matching backend form schemas
   - `dashboard/`: Dashboard-specific widgets
   - `letters/`: Document generation components
   - `ProtectedRoute.jsx`, `AdminRoute.jsx`: Route guards

### Workflow State Flow

The workflow progresses through these states in order:
1. **ApplicantRequest** → Initial request submission
2. **CEOInstruction** → CEO/Office chief approval
3. **Form1** → Basic applicant information
4. **Form2** → Property details
5. **DocsCollection** → Document gathering
6. **Form3** → Property status review (7 sequential approval steps)
7. **Form4** → Valuation and approvals
8. **AMLForm** → Anti-money laundering check
9. **EvaluationCommittee** → Committee evaluation
10. **AppraisalFeeDeposit** → Fee payment
11. **AppraisalNotice** → Appraisal notification
12. **AppraisalOpinion** → Expert opinion
13. **AppraisalDecision** → Final decision
14. **Settlment** → Settlement/completion (terminal state)

### Form3 Special Behavior

Form3 has a complex 7-step approval chain defined in `form_3.py`:
1. Legal deputy fills report
2. Legal manager approves (with signature)
3. Real estate technical lead fills report
4. Acquisition manager approves (with signature)
5. Real estate manager approves (with signature)
6. CEO gives final approval (with signature)
7. Final review and completion

**Key implementation details:**
- Each step is role-gated with specific `role` fields
- Steps have `section` fields indicating which form section they modify
- Some steps require signature fields (`signature_field`)
- Use `PropertyStatusReviewForm.get_editable_sections()` to check user permissions
- Progress tracking via `get_form3_progress_info()` on Workflow model

### Role System

**Role Groups** (`apps/accounts/models.py`):
- `OrgRoleGroup`: Departments (e.g., CEO, RE, LC, FA)
- `OrgRole`: Specific roles with code and name_fa
- `Membership`: Links users to roles

**Common Role Codes** (from `workflow_spec.py`):
- `CEO_MANAGER`, `CEO_OFFICE_CHIEF`: CEO office roles
- `RE_MANAGER`: Real estate manager
- `RE_ACQUISITION_REGEN_LEAD`: Acquisition lead
- `RE_VALUATION_LEASING_LEAD`: Valuation lead
- `RE_TECH_URBANISM_LEAD`: Technical/urbanism lead
- `LC_CONTRACTS_ASSEMBLIES_LEAD`: Legal contracts lead
- `FA_ACCOUNTING_LEAD`: Financial accounting lead

## Important Technical Notes

### MongoDB ObjectId Handling
- All models use `ObjectIdAutoField` as primary key
- Custom serializer in `workflow_engine/encoders.py` handles ObjectId → string conversion
- Use `MongoJSONRenderer` in DRF for proper JSON serialization

### Workflow Data Storage
- Workflow data stored as JSON in `_data` TextField
- Access via `workflow.data` property (returns dict)
- Update via `workflow.update_data(new_data, merge=True)`
- Use `workflow.update_from_form(form_number, form_data)` for form submissions

### FSM Transition Safety
- All transitions wrapped in `@transaction.atomic()`
- Concurrent transitions protected by `ConcurrentTransitionMixin`
- Always check `actions_ok()` condition before advancing states
- Use `workflow.advance_to_next_state(by=user)` instead of calling transitions directly

### Frontend-Backend API Contract
- **API base URLs**: `/api/` and `/api/v1/` (both point to same endpoints)
- **Auth**: `/api/auth/` (POST username/password, returns JWT)
- **Current user**: `/api/me/` (GET with JWT, returns user + roles)
- **Workflows**: `/api/workflows/` (Standard REST ViewSet)
  - `GET /api/workflows/` - List workflows (with permission metadata)
  - `POST /api/workflows/` - Create workflow
  - `GET /api/workflows/{id}/` - Get workflow detail (with can_view, can_edit, can_approve flags)
  - `PUT/PATCH /api/workflows/{id}/` - Update workflow
  - `DELETE /api/workflows/{id}/` - Delete workflow (permission required)
  - `GET /api/workflows/inbox/` - Get user's pending workflows
  - `GET /api/workflows/{id}/status/` - Get workflow status and approval info
  - `POST /api/workflows/{id}/approve/` - Approve at current step
  - `POST /api/workflows/{id}/transition/` - Manually trigger state transition
  - `GET /api/workflows/stats/` - Dashboard statistics
- **Forms**: `/api/workflow-forms/{workflow_id}/`
  - `GET ?form_number=N` - Get form data (filtered by permissions)
  - `POST submit/` - Submit form data (with form_number and data)
- **Attachments**: `/api/attachments/` (Standard REST ViewSet)
- **Comments**: `/api/comments/` (Standard REST ViewSet)
- **Actions**: `/api/actions/` (Read-only ViewSet for audit trail)

### Environment Configuration
Both backend and frontend use environment variables:
- Backend: `backend/.env` (see `.env.example` for template)
- Frontend: Build-time env vars in Vite config
- Required: MongoDB connection, MinIO credentials, JWT secret

## Permission System Deep Dive

The system implements a comprehensive 4-level permission hierarchy:

### 1. State-Level Permissions (`StatePermission`)
Controls who can VIEW, EDIT, APPROVE, TRANSITION, or DELETE workflows in specific states.
- Assigned to roles or individual users
- Optional `restrict_to_own` flag (user can only access their own workflows)
- Example: `RE_MANAGER` can VIEW all workflows in `Form1` state

### 2. State-Step Permissions (`StateStepPermission`)
Controls who can approve specific steps within multi-step approval states.
- Automatically created from `ADVANCER_STEPS` specification
- Example: Only `CEO_MANAGER` can approve step 0 of `CEOInstruction` state

### 3. Form-Level Permissions (`FormPermission`)
Controls who can VIEW or EDIT specific forms (form_number).
- Can be state-specific or global
- Example: `RE_ACQUISITION_REGEN_EXPERT` can EDIT Form 1

### 4. Field-Level Permissions (`FormFieldPermission`)
Fine-grained control over individual form fields using JSON paths.
- Enables role-based form sections (e.g., legal deputy only edits legal fields)
- Example: `LC_MANAGER` can only edit `legalDeputyReport.headOfContractsSignature`

### 5. Permission Overrides (`PermissionOverride`)
Temporary workflow-specific permission grants with optional expiration.
- Useful for delegating access or temporary assignments
- Must specify granting user and reason

### Permission Checking Utilities
Located in `apps/permissions/utils.py`:
- `check_state_permission(user, workflow, permission_type)` - Check state access
- `check_form_permission(user, form_number, permission_type, state, workflow)` - Check form access
- `check_form_field_permission(user, form_number, field_path, permission_type, state, workflow)` - Check field access
- `get_editable_fields(user, form_number, state, workflow)` - Get list of editable fields for user
- `filter_form_data_by_permissions(user, form_number, form_data, state, workflow)` - Filter form data to only allowed fields

### DRF Permission Classes
Located in `api/permissions/workflow_permissions.py`:
- `WorkflowPermission` - General workflow access (VIEW/EDIT/DELETE)
- `WorkflowApprovalPermission` - Approval action permission
- `WorkflowTransitionPermission` - State transition permission
- `WorkflowFormPermission` - Form access permission
- Shorthand classes: `CanViewWorkflow`, `CanEditWorkflow`, `CanApproveWorkflow`, etc.

### Bootstrapping Permissions
Run `python manage.py bootstrap_permissions` after setting up roles:
1. Creates state permissions for all workflow states
2. Creates step permissions from `ADVANCER_STEPS`
3. Creates form permissions for Forms 1-3
4. Creates field-level permissions for Form 3 sections
5. Use `--clear` flag to reset all permissions

## File Organization Best Practices

### When Working with APIs:
1. **Add new serializers** to `backend/api/v1/serializers.py`
2. **Add new views/viewsets** to `backend/api/v1/views.py`
3. **Add new permissions** to `backend/api/permissions/workflow_permissions.py`
4. **Register URLs** in `backend/api/v1/urls.py`

### When Working with Permissions:
1. **Permission models** in `apps/permissions/models.py`
2. **Permission logic** in `apps/permissions/utils.py`
3. **Admin interface** in `apps/permissions/admin.py`
4. **Bootstrap scripts** in `apps/permissions/management/commands/`

### Deprecated File Locations:
- ❌ `apps/workflows/api/api.py` (OLD - use `api/v1/views.py`)
- ❌ `apps/workflows/api/serializers.py` (OLD - use `api/v1/serializers.py`)
- ❌ `apps/accounts/api.py` (OLD - integrate into `api/v1/`)
- ✅ All new API code goes in centralized `backend/api/` directory

## Testing Considerations

When writing tests:
- Use Django's `TestCase` with MongoDB test database
- Mock MinIO connections for file upload tests
- Test FSM transitions with different user roles
- Verify approval chain logic in `actions.py`
- Test Form3's sequential approval flow separately
- **Test permission system**: Verify role-based and user-based permissions at all levels
- **Test permission overrides**: Verify temporary grants and expirations
- Frontend tests should mock API responses from `client.js`
- do not generate new MD file, save your progress in PROGRESS.md .
- for testing and running application use docker compose exec