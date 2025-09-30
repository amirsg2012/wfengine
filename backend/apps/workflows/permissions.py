# apps/workflows/permissions.py
from typing import Dict, List, Any

def get_user_roles(user) -> List[str]:
    """Get list of role codes for a user"""
    if not user.is_authenticated:
        return []
    
    return [membership.role.code for membership in user.memberships.all()]

def can_user_edit_form3_section(workflow, section: str, user) -> bool:
    """Check if user can edit specific Form3 section"""
    from .forms.form_3 import PropertyStatusReviewForm
    
    if workflow.state != 'Form3':
        return False
    
    user_roles = get_user_roles(user)
    editable_sections = {}
    
    # Check against all user roles
    for role in user_roles:
        role_sections = PropertyStatusReviewForm.get_editable_sections(workflow, role)
        for sec, editable in role_sections.items():
            if editable:
                editable_sections[sec] = True
    
    return editable_sections.get(section, False)

def get_form3_user_permissions(workflow, user) -> Dict[str, Any]:
    """Get comprehensive Form3 permissions for user"""
    from .forms.form_3 import PropertyStatusReviewForm
    
    if workflow.state != 'Form3':
        return {'can_view': False, 'can_edit_sections': {}}
    
    user_roles = get_user_roles(user)
    current_step_info = PropertyStatusReviewForm.get_current_step_info(workflow)
    completion_status = PropertyStatusReviewForm.get_completion_status(workflow)
    
    # Determine if user can act in current step
    can_act_in_current_step = current_step_info.get('role') in user_roles
    
    # Get editable sections
    editable_sections = {}
    for role in user_roles:
        role_sections = PropertyStatusReviewForm.get_editable_sections(workflow, role)
        for section, editable in role_sections.items():
            if editable:
                editable_sections[section] = True
    
    return {
        'can_view': len(user_roles) > 0,  # Any authenticated user with roles can view
        'can_edit_sections': editable_sections,
        'current_step': current_step_info,
        'completion_status': completion_status,
        'can_act_in_current_step': can_act_in_current_step,
        'user_roles': user_roles
    }