# apps/workflows/forms/form_3.py
# ⚠️ DEPRECATED: This file is deprecated.
# Form 3 has been migrated to DynamicForm in the database.
# Form 3 approval steps have been migrated to StateStepPermission in the database.
# Edit at: /admin/workflows/dynamicform/ and /admin/permissions/statesteppermission/
# See: apps/workflows/forms/DEPRECATED.md

from typing import Dict, Any
from .base import BaseWorkflowForm
from .registry import register_form

@register_form
class PropertyStatusReviewForm(BaseWorkflowForm):
    """Form 3: Property Status Review"""
    
    form_number = 3
    form_title = "Property Status Review"
    
    # DEPRECATED: APPROVAL_STEPS moved to database (StateStepPermission)
    # Use migrate_form3_to_db management command to populate database
    # All Form3 steps are now admin-configurable via /admin/permissions/statesteppermission/

    @classmethod
    def get_approval_steps(cls):
        """Get Form3 approval steps from database (StateStepPermission)"""
        from apps.permissions.models import StateStepPermission

        steps = StateStepPermission.objects.filter(
            state='Form3',
            is_active=True
        ).select_related('role').order_by('step')

        # Convert to dict format for backward compatibility
        approval_steps = {}
        for step_perm in steps:
            # Use 1-based indexing for compatibility
            step_num = step_perm.step + 1
            approval_steps[step_num] = {
                'role': step_perm.role.code if step_perm.role else '',
                'section': step_perm.section or '',
                'signature_field': step_perm.signature_field or '',
                'description': step_perm.description or '',
                'action_type': step_perm.action_type or 'APPROVE'
            }

        return approval_steps

    # For backward compatibility - returns database-driven steps
    @property
    def APPROVAL_STEPS(self):
        return self.get_approval_steps()
    
    @classmethod
    def get_schema(cls) -> Dict[str, Any]:
        """Return the JSON schema for Form 3"""
        return {
            "type": "object",
            "properties": {
                "formTitle": {
                    "type": "string",
                    "default": cls.form_title
                },
                "formNumber": {
                    "type": "integer",
                    "default": cls.form_number
                },
                "requestNumber": {"type": "string"},
                "requestDate": {"type": "string", "format": "date"},
                "clientName": {"type": "string"},
                "legalDeputyReport": {
                    "type": "object",
                    "properties": {
                        "ownerName": {"type": "string"},
                        "hasBenchaghAndDeed": {"type": "boolean", "default": False},
                        "isMortgaged": {"type": "boolean", "default": False},
                        "isSingleSheetDeed": {"type": "boolean", "default": False},
                        "hasLegalAuthorityToTransfer": {"type": "boolean", "default": False},
                        "isTransferToShahrBankPermissible": {"type": "boolean", "default": False},
                        "isPowerOfAttorneyApproved": {"type": "boolean", "default": False},
                        "isOwnershipVerified": {"type": "boolean", "default": False},
                        "isPropertyBannedFromTransactions": {"type": "boolean", "default": False},
                        "description": {"type": "string"},
                        "headOfContractsSignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        },
                        "legalDeputySignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                },
                "realEstateDeputyReport": {
                    "type": "object",
                    "properties": {
                        "registrationPlateNumber": {"type": "string"},
                        "parcelNumber": {"type": "string"},
                        "propertyArea": {"type": "number"},
                        "propertyAddress": {"type": "string"},
                        "landUseType": {"type": "string"},
                        "propertyLocation": {"type": "string"},
                        "buildingPermitDate": {"type": "string", "format": "date"},
                        "noViolationCertificateDate": {"type": "string", "format": "date"},
                        "generalCompletionCertificateDate": {"type": "string", "format": "date"},
                        "apartmentCompletionCertificateDate": {"type": "string", "format": "date"},
                        "hasApartmentSeparationMinutes": {"type": "boolean", "default": False},
                        "hasTenant": {"type": "boolean", "default": False},
                        "documentsVerified": {"type": "boolean", "default": False},
                        "landUseInDetailedPlan": {"type": "string"},
                        "hasCoolingAndHeatingSystem": {"type": "boolean", "default": False},
                        "hasFireAlarmAndExtinguishingSystem": {"type": "boolean", "default": False},
                        "hasFireDeptCertificate": {"type": "boolean", "default": False},
                        "hasElevatorCertificate": {"type": "boolean", "default": False},
                        "levyBill": {
                            "type": "object",
                            "properties": {
                                "hasBill": {"type": "boolean", "default": False},
                                "number": {"type": "string"},
                                "date": {"type": "string", "format": "date"}
                            }
                        },
                        "isUrbanPlanningTransferPermissible": {"type": "boolean", "default": False},
                        "hasAdversary": {"type": "boolean", "default": False},
                        "isTransferPermissibleAfterValuation": {"type": "boolean", "default": False},
                        "description": {"type": "string"},
                        "urbanPlanningManagerSignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        },
                        "acquisitionManagerSignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        },
                        "realEstateDeputySignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                },
                "finalApproval": {
                    "type": "object",
                    "properties": {
                        "ceoSignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        },
                        "chairmanOfTheBoardSignature": {
                            "type": "object",
                            "properties": {
                                "signatureUrl": {"type": "string"},
                                "signatureHash": {"type": "string"},
                                "signedBy": {"type": "string"},
                                "signedAt": {"type": "string", "format": "date-time"}
                            }
                        }
                    }
                }
            }
        }
    
    @classmethod
    def extract_from_workflow(cls, workflow, user_roles=None) -> Dict[str, Any]:
        """Extract Form 3 data from workflow with optional permission filtering"""
        data = workflow.data
        
        # Build Form 3 structure from workflow data
        form_data = {
            "formTitle": cls.form_title,
            "formNumber": cls.form_number,
            "requestNumber": data.get("requestNumber"),
            "requestDate": data.get("requestDate"),
            "clientName": data.get("clientName") or workflow.applicant_name,  # Inherit from previous forms
            "legalDeputyReport": data.get("legalDeputyReport", {}),
            "realEstateDeputyReport": data.get("realEstateDeputyReport", {}),
            "finalApproval": data.get("finalApproval", {})
        }
        
        # Filter data based on user permissions if provided
        if user_roles:
            from .form_3_helpers import Form3Helper
            # Convert user_roles to user object or skip filtering
            # This is kept for backward compatibility but should pass user object
            # form_data = Form3Helper.filter_form_data_for_user(form_data, user, workflow)
            pass  # Skip filtering if only roles provided, need user object

        return form_data
    
    @classmethod
    def map_to_workflow(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map Form 3 data to workflow data structure"""
        # Remove form metadata
        workflow_data = form_data.copy()
        workflow_data.pop("formTitle", None)
        workflow_data.pop("formNumber", None)
        
        return workflow_data
    
    @classmethod
    def get_current_step_info(cls, workflow) -> Dict[str, Any]:
        """Get current step information for Form 3"""
        from ..actions import current_step

        # Get current step within Form3 state (0-based)
        current_step_num = current_step(workflow)

        # Get approval steps from database
        approval_steps = cls.get_approval_steps()

        # Convert to 1-based for lookup
        step_key = current_step_num + 1

        if step_key in approval_steps:
            step_info = approval_steps[step_key].copy()
            step_info['step_number'] = current_step_num
            step_info['total_steps'] = len(approval_steps)
            return step_info

        # Default to first step if not found
        if 1 in approval_steps:
            step_info = approval_steps[1].copy()
            step_info['step_number'] = 0
            step_info['total_steps'] = len(approval_steps)
            return step_info

        # Fallback if no steps configured
        return {
            'step_number': 0,
            'total_steps': 0,
            'role': '',
            'section': '',
            'description': 'No steps configured'
        }
    
    @classmethod
    def get_editable_sections(cls, workflow, user) -> Dict[str, bool]:
        """Determine which sections are editable for the given user"""
        from .form_3_helpers import Form3Helper

        current_step = cls.get_current_step_info(workflow).get('step_number', 1)
        permissions = Form3Helper.get_user_permissions(workflow, user, current_step)

        return permissions.get('editable_sections', {})
    
    @classmethod
    def is_step_completed(cls, workflow, step_number) -> bool:
        """Check if a specific step is completed (step_number is 1-based)"""
        approval_steps = cls.get_approval_steps()

        if step_number not in approval_steps:
            return False

        step_info = approval_steps[step_number]
        section = step_info.get('section')
        signature_field = step_info.get('signature_field')
        action_type = step_info.get('action_type')

        data = workflow.data
        section_data = data.get(section, {})

        # If step requires signature (APPROVE action), check if it's signed
        if signature_field:
            # Signature field might be nested (e.g., "legalDeputyReport.headOfContractsSignature")
            # Extract just the field name part
            field_name = signature_field.split('.')[-1]
            return bool(section_data.get(field_name))

        # If step is FILL action, check if section has basic required data
        if action_type == 'FILL':
            if section == 'legalDeputyReport':
                return bool(section_data.get('ownerName'))  # Basic completion check
            elif section == 'realEstateDeputyReport':
                return bool(section_data.get('propertyAddress'))  # Basic completion check

        return False
    
    @classmethod
    def get_completion_status(cls, workflow) -> Dict[str, Any]:
        """Get overall completion status of Form 3"""
        approval_steps = cls.get_approval_steps()
        completed_steps = []
        pending_steps = []

        for step_num in range(1, len(approval_steps) + 1):
            if cls.is_step_completed(workflow, step_num):
                completed_steps.append(step_num)
            else:
                pending_steps.append(step_num)

        total_steps = len(approval_steps) if approval_steps else 1

        return {
            'completed_steps': completed_steps,
            'pending_steps': pending_steps,
            'completion_percentage': len(completed_steps) / total_steps * 100,
            'is_fully_completed': len(pending_steps) == 0
        }