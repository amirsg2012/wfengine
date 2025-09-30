# apps/workflows/forms/form_3_permissions.py
from typing import Dict, List, Any

class Form3PermissionManager:
    """Manage permissions and visibility for Form3 sections"""
    
    # Define section visibility rules
    SECTION_VISIBILITY = {
        # Basic info is visible to all but editable only in first step
        'basic_info': {
            'visible_to': ['LC_CONTRACTS_ASSEMBLIES_LEAD', 'LC_MANAGER', 'RE_TECH_URBANISM_LEAD', 
                          'RE_ACQUISITION_REGEN_LEAD', 'RE_MANAGER', 'CEO_MANAGER', 'CHAIRMAN_OF_BOARD'],
            'editable_by_step': {1: ['LC_CONTRACTS_ASSEMBLIES_LEAD']}
        },
        
        # Legal section
        'legalDeputyReport': {
            'visible_to': ['LC_CONTRACTS_ASSEMBLIES_LEAD', 'LC_MANAGER', 'RE_TECH_URBANISM_LEAD', 
                          'RE_ACQUISITION_REGEN_LEAD', 'RE_MANAGER', 'CEO_MANAGER', 'CHAIRMAN_OF_BOARD'],
            'editable_by_step': {
                1: ['LC_CONTRACTS_ASSEMBLIES_LEAD'],  # Fill report
                2: ['LC_MANAGER']  # Add signature
            }
        },
        
        # Real estate section
        'realEstateDeputyReport': {
            'visible_to': ['RE_TECH_URBANISM_LEAD', 'RE_ACQUISITION_REGEN_LEAD', 'RE_MANAGER', 
                          'CEO_MANAGER', 'CHAIRMAN_OF_BOARD'],
            'editable_by_step': {
                3: ['RE_TECH_URBANISM_LEAD'],     # Fill report
                4: ['RE_ACQUISITION_REGEN_LEAD'], # Add acquisition signature
                5: ['RE_MANAGER']                 # Add manager signature
            }
        },
        
        # Final approval section
        'finalApproval': {
            'visible_to': ['CEO_MANAGER', 'CHAIRMAN_OF_BOARD'],
            'editable_by_step': {
                6: ['CEO_MANAGER'],        # CEO signature
                7: ['CHAIRMAN_OF_BOARD']   # Chairman signature
            }
        }
    }
    
    # Define field-level permissions within sections
    FIELD_PERMISSIONS = {
        'legalDeputyReport': {
            'step_1_fields': [  # LC_CONTRACTS_ASSEMBLIES_LEAD can edit these
                'ownerName', 'hasBenchaghAndDeed', 'isMortgaged', 'isSingleSheetDeed',
                'hasLegalAuthorityToTransfer', 'isTransferToShahrBankPermissible',
                'isPowerOfAttorneyApproved', 'isOwnershipVerified', 
                'isPropertyBannedFromTransactions', 'description'
            ],
            'step_2_fields': [  # LC_MANAGER can edit these
                'headOfContractsSignature'
            ]
        },
        'realEstateDeputyReport': {
            'step_3_fields': [  # RE_TECH_URBANISM_LEAD can edit these
                'registrationPlateNumber', 'parcelNumber', 'propertyArea', 'propertyAddress',
                'landUseType', 'propertyLocation', 'buildingPermitDate', 'noViolationCertificateDate',
                'generalCompletionCertificateDate', 'apartmentCompletionCertificateDate',
                'hasApartmentSeparationMinutes', 'hasTenant', 'documentsVerified',
                'landUseInDetailedPlan', 'hasCoolingAndHeatingSystem', 'hasFireAlarmAndExtinguishingSystem',
                'hasFireDeptCertificate', 'hasElevatorCertificate', 'levyBill',
                'isUrbanPlanningTransferPermissible', 'hasAdversary', 'isTransferPermissibleAfterValuation',
                'description'
            ],
            'step_4_fields': [  # RE_ACQUISITION_REGEN_LEAD can edit these
                'acquisitionManagerSignature'
            ],
            'step_5_fields': [  # RE_MANAGER can edit these
                'realEstateDeputySignature'
            ]
        },
        'finalApproval': {
            'step_6_fields': ['ceoSignature'],           # CEO_MANAGER
            'step_7_fields': ['chairmanOfTheBoardSignature']  # CHAIRMAN_OF_BOARD
        }
    }
    
    @classmethod
    def get_user_permissions(cls, workflow, user_roles: List[str], current_step: int) -> Dict[str, Any]:
        """Get comprehensive permissions for user in Form3"""
        permissions = {
            'visible_sections': [],
            'editable_sections': {},
            'editable_fields': {},
            'can_act_in_current_step': False,
            'next_action': None
        }
        
        # Check each section
        for section, rules in cls.SECTION_VISIBILITY.items():
            # Check visibility
            if any(role in rules['visible_to'] for role in user_roles):
                permissions['visible_sections'].append(section)
                
                # Check editability for current step
                editable_roles = rules['editable_by_step'].get(current_step, [])
                if any(role in editable_roles for role in user_roles):
                    permissions['editable_sections'][section] = True
                    
                    # Get specific editable fields
                    editable_fields = cls._get_editable_fields(section, current_step)
                    if editable_fields:
                        permissions['editable_fields'][section] = editable_fields
                        
                    # User can act in current step
                    permissions['can_act_in_current_step'] = True
                    permissions['next_action'] = cls._get_next_action(current_step)
        
        return permissions
    
    @classmethod
    def _get_editable_fields(cls, section: str, step: int) -> List[str]:
        """Get list of editable fields for a section in a specific step"""
        field_rules = cls.FIELD_PERMISSIONS.get(section, {})
        step_key = f'step_{step}_fields'
        return field_rules.get(step_key, [])
    
    @classmethod
    def _get_next_action(cls, current_step: int) -> Dict[str, str]:
        """Get the next action description for current step"""
        action_descriptions = {
            1: {"action": "fill_legal_report", "description": "\u062a\u06a9\u0645\u06cc\u0644 \u06af\u0632\u0627\u0631\u0634 \u062d\u0642\u0648\u0642\u06cc"},
            2: {"action": "sign_legal_report", "description": "\u0627\u0645\u0636\u0627\u0621 \u06af\u0632\u0627\u0631\u0634 \u062d\u0642\u0648\u0642\u06cc"},
            3: {"action": "fill_realestate_report", "description": "\u062a\u06a9\u0645\u06cc\u0644 \u06af\u0632\u0627\u0631\u0634 \u0627\u0645\u0644\u0627\u06a9"},
            4: {"action": "sign_acquisition", "description": "\u0627\u0645\u0636\u0627\u0621 \u0645\u062f\u06cc\u0631 \u062a\u0645\u0644\u06cc\u06a9"},
            5: {"action": "sign_realestate", "description": "\u0627\u0645\u0636\u0627\u0621 \u0645\u0639\u0627\u0648\u0646 \u0627\u0645\u0644\u0627\u06a9"},
            6: {"action": "ceo_approval", "description": "\u062a\u0623\u06cc\u06cc\u062f \u0645\u062f\u06cc\u0631\u0639\u0627\u0645\u0644"},
            7: {"action": "chairman_approval", "description": "\u062a\u0623\u06cc\u06cc\u062f \u0631\u0626\u06cc\u0633 \u0647\u06cc\u0626\u062a \u0645\u062f\u06cc\u0631\u0647"}
        }
        return action_descriptions.get(current_step, {"action": "unknown", "description": "\u0646\u0627\u0645\u0634\u062e\u0635"})
    
    @classmethod
    def filter_form_data_for_user(cls, form_data: Dict[str, Any], user_permissions: Dict[str, Any]) -> Dict[str, Any]:
        """Filter form data based on user permissions"""
        filtered_data = {}
        
        # Include basic form metadata
        filtered_data.update({
            "formTitle": form_data.get("formTitle"),
            "formNumber": form_data.get("formNumber")
        })
        
        # Include visible sections
        for section in user_permissions['visible_sections']:
            if section == 'basic_info':
                # Handle basic info fields
                filtered_data.update({
                    "requestNumber": form_data.get("requestNumber"),
                    "requestDate": form_data.get("requestDate"),
                    "clientName": form_data.get("clientName")
                })
            else:
                # Handle structured sections
                if section in form_data:
                    filtered_data[section] = form_data[section]
        
        return filtered_data
    
    @classmethod
    def validate_user_form_submission(cls, form_data: Dict[str, Any], user_permissions: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that user is only submitting data they have permission to edit"""
        errors = {}
        
        # Check if user is trying to edit sections they don't have permission for
        for section, data in form_data.items():
            if section in ['formTitle', 'formNumber']:
                continue  # Skip metadata
                
            if section == 'basic_info':
                # Handle basic info validation
                if not user_permissions['editable_sections'].get('basic_info', False):
                    if any(form_data.get(field) for field in ['requestNumber', 'requestDate', 'clientName']):
                        errors['basic_info'] = "\u0634\u0645\u0627 \u0645\u062c\u0627\u0632 \u0628\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0627\u0637\u0644\u0627\u0639\u0627\u062a \u067e\u0627\u06cc\u0647 \u0646\u06cc\u0633\u062a\u06cc\u062f"
            else:
                # Handle structured sections
                if section not in user_permissions['editable_sections']:
                    if data:  # If there's any data being submitted for this section
                        errors[section] = f"\u0634\u0645\u0627 \u0645\u062c\u0627\u0632 \u0628\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0628\u062e\u0634 {section} \u0646\u06cc\u0633\u062a\u06cc\u062f"
                else:
                    # Check field-level permissions
                    allowed_fields = user_permissions['editable_fields'].get(section, [])
                    if allowed_fields:  # If there are specific field restrictions
                        for field, value in data.items():
                            if field not in allowed_fields and value:
                                errors[f"{section}.{field}"] = f"\u0634\u0645\u0627 \u0645\u062c\u0627\u0632 \u0628\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0641\u06cc\u0644\u062f {field} \u0646\u06cc\u0633\u062a\u06cc\u062f"
        
        return errors