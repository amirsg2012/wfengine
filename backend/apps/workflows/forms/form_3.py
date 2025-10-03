# apps/workflows/forms/form_3.py
from typing import Dict, Any
from .base import BaseWorkflowForm
from .registry import register_form

@register_form
class PropertyStatusReviewForm(BaseWorkflowForm):
    """Form 3: Property Status Review"""
    
    form_number = 3
    form_title = "Property Status Review"
    
    # Define the approval chain steps
    APPROVAL_STEPS = {
        1: {
            'role': 'LC_CONTRACTS_ASSEMBLIES_LEAD',
            'action': 'fill_legal_report',
            'section': 'legalDeputyReport',
            'description': 'تکمیل گزارش معاونت حقوقی'
        },
        2: {
            'role': 'LC_MANAGER',
            'action': 'approve_legal_report',
            'section': 'legalDeputyReport',
            'signature_field': 'headOfContractsSignature',
            'description': 'تأیید گزارش حقوقی توسط مدیر'
        },
        3: {
            'role': 'RE_TECH_URBANISM_LEAD',
            'action': 'fill_realestate_report',
            'section': 'realEstateDeputyReport',
            'description': 'تکمیل گزارش معاونت املاک'
        },
        4: {
            'role': 'RE_ACQUISITION_REGEN_LEAD',
            'action': 'approve_acquisition',
            'section': 'realEstateDeputyReport',
            'signature_field': 'acquisitionManagerSignature',
            'description': 'تأیید توسط مدیر تملیک'
        },
        5: {
            'role': 'RE_MANAGER',
            'action': 'approve_realestate_report',
            'section': 'realEstateDeputyReport',
            'signature_field': 'realEstateDeputySignature',
            'description': 'تأیید گزارش املاک توسط معاون'
        },
        6: {
            'role': 'CEO_MANAGER',
            'action': 'ceo_final_approval',
            'section': 'finalApproval',
            'signature_field': 'ceoSignature',
            'description': 'تأیید نهایی مدیرعامل'
        },
        7: {
            'role': 'CHAIRMAN_OF_BOARD',
            'action': 'chairman_final_approval',
            'section': 'finalApproval',
            'signature_field': 'chairmanOfTheBoardSignature',
            'description': 'تأیید نهایی رئیس هیئت مدیره'
        }
    }
    
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
        
        # Get current step within Form3 state
        current_step_num = current_step(workflow)
        
        if current_step_num in cls.APPROVAL_STEPS:
            step_info = cls.APPROVAL_STEPS[current_step_num].copy()
            step_info['step_number'] = current_step_num
            step_info['total_steps'] = len(cls.APPROVAL_STEPS)
            return step_info
        
        return {
            'step_number': 1,
            'total_steps': len(cls.APPROVAL_STEPS),
            'role': 'LC_CONTRACTS_ASSEMBLIES_LEAD',
            'action': 'fill_legal_report',
            'section': 'legalDeputyReport',
            'description': 'تکمیل گزارش معاونت حقوقی'
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
        """Check if a specific step is completed"""
        if step_number not in cls.APPROVAL_STEPS:
            return False
        
        step_info = cls.APPROVAL_STEPS[step_number]
        section = step_info.get('section')
        signature_field = step_info.get('signature_field')
        
        data = workflow.data
        section_data = data.get(section, {})
        
        # If step has a signature field, check if it's signed
        if signature_field:
            return bool(section_data.get(signature_field))
        
        # If step is filling a section, check if section has basic required data
        if step_info.get('action') == 'fill_legal_report':
            return bool(section_data.get('ownerName'))  # Basic completion check
        elif step_info.get('action') == 'fill_realestate_report':
            return bool(section_data.get('propertyAddress'))  # Basic completion check
        
        return False
    
    @classmethod
    def get_completion_status(cls, workflow) -> Dict[str, Any]:
        """Get overall completion status of Form 3"""
        completed_steps = []
        pending_steps = []
        
        for step_num in range(1, len(cls.APPROVAL_STEPS) + 1):
            if cls.is_step_completed(workflow, step_num):
                completed_steps.append(step_num)
            else:
                pending_steps.append(step_num)
        
        return {
            'completed_steps': completed_steps,
            'pending_steps': pending_steps,
            'completion_percentage': len(completed_steps) / len(cls.APPROVAL_STEPS) * 100,
            'is_fully_completed': len(pending_steps) == 0
        }