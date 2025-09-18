# apps/workflows/forms/form_2.py
from typing import Dict, Any
from .base import BaseWorkflowForm
from .registry import register_form

@register_form
class ClientUndertakingForm(BaseWorkflowForm):
    """Form 2: Client Undertaking Form"""
    
    form_number = 2
    form_title = "Client Undertaking Form"
    
    @classmethod
    def get_schema(cls) -> Dict[str, Any]:
        """Return the JSON schema for Form 2"""
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
                "applicantDetails": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "maxLength": 100},
                        "fatherName": {"type": "string", "maxLength": 50},
                        "nationalCode": {"type": "string", "pattern": "^[0-9]{10}$"},
                        "isRepresentative": {"type": "boolean", "default": False},
                        "powerOfAttorneyNumber": {"type": "string"},
                        "notaryOfficeNumber": {"type": "string"},
                        "propertyOwnerName": {"type": "string"}
                    },
                    "required": ["name", "nationalCode"]
                },
                "propertyDetails": {
                    "type": "object",
                    "properties": {
                        "address": {"type": "string"},
                        "registrationPlateNumber": {"type": "string"}
                    }
                },
                "agreement": {
                    "type": "object",
                    "properties": {
                        "contactNumber": {"type": "string"},
                        "signatureDate": {"type": "string", "format": "date"},
                        "signature": {"type": "string"},  # JWT
                        "fingerprint": {"type": "string"}  # JWT
                    }
                }
            }
        }
    
    @classmethod
    def extract_from_workflow(cls, workflow) -> Dict[str, Any]:
        """Extract Form 2 data from workflow"""
        data = workflow.data
        
        # Get name from personalInformation if available
        personal_info = data.get("personalInformation", {})
        full_name = None
        if personal_info.get("firstName") and personal_info.get("lastName"):
            full_name = f"{personal_info['firstName']} {personal_info['lastName']}"
        
        # Build applicant details, preferring existing applicantDetails but falling back to personalInformation
        applicant_details = data.get("applicantDetails", {}).copy()
        if not applicant_details.get("name") and full_name:
            applicant_details["name"] = full_name
        if not applicant_details.get("nationalCode") and personal_info.get("nationalCode"):
            applicant_details["nationalCode"] = personal_info["nationalCode"]
        
        # Build property details
        property_details = data.get("propertyDetails", {}).copy()
        if not property_details.get("address") and personal_info.get("residenceAddress"):
            property_details["address"] = personal_info["residenceAddress"]
        if not property_details.get("registrationPlateNumber") and data.get("propertyRegistrationPlateNumber"):
            property_details["registrationPlateNumber"] = data["propertyRegistrationPlateNumber"]
        
        form_data = {
            "formTitle": cls.form_title,
            "formNumber": cls.form_number,
            "applicantDetails": applicant_details,
            "propertyDetails": property_details,
            "agreement": data.get("agreement", {})
        }
        
        return form_data
    
    @classmethod
    def map_to_workflow(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map Form 2 data to workflow data structure"""
        workflow_data = {}
        
        # Map applicant details
        applicant_details = form_data.get("applicantDetails", {})
        if applicant_details:
            workflow_data["applicantDetails"] = applicant_details
            
            # Also try to split name back to firstName/lastName if personalInformation doesn't exist
            full_name = applicant_details.get("name", "")
            if full_name and "personalInformation" not in workflow_data:
                name_parts = full_name.strip().split(" ", 1)
                personal_info = {
                    "firstName": name_parts[0] if name_parts else "",
                    "lastName": name_parts[1] if len(name_parts) > 1 else "",
                    "nationalCode": applicant_details.get("nationalCode")
                }
                workflow_data["personalInformation"] = {k: v for k, v in personal_info.items() if v}
        
        # Map property details
        property_details = form_data.get("propertyDetails", {})
        if property_details:
            workflow_data["propertyDetails"] = property_details
            
            # Also update top-level propertyRegistrationPlateNumber if provided
            if property_details.get("registrationPlateNumber"):
                workflow_data["propertyRegistrationPlateNumber"] = property_details["registrationPlateNumber"]
        
        # Map agreement
        if form_data.get("agreement"):
            workflow_data["agreement"] = form_data["agreement"]
        
        return workflow_data