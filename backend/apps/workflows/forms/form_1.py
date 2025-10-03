# apps/workflows/forms/form_1.py
from typing import Dict, Any
from .base import BaseWorkflowForm
from .registry import register_form

@register_form
class SpecificationsAndDocumentsForm(BaseWorkflowForm):
    """Form 1: Specifications and Document Submission Form"""
    
    form_number = 1
    form_title = "Specifications and Document Submission Form"
    
    @classmethod
    def get_schema(cls) -> Dict[str, Any]:
        """Return the JSON schema for Form 1"""
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
                "personalInformation": {
                    "type": "object",
                    "properties": {
                        "firstName": {"type": "string", "maxLength": 50},
                        "lastName": {"type": "string", "maxLength": 50},
                        "birthCertificateNumber": {"type": "string"},
                        "nationalCode": {"type": "string", "pattern": "^[0-9]{10}$"},
                        "residenceAddress": {"type": "string"},
                        "emergencyContactNumbers": {"type": "string"},
                        "landlineNumber": {"type": "string"},
                        "mobileNumber": {"type": "string"}
                    },
                    "required": ["firstName", "lastName", "nationalCode"]
                },
                "roleAndOwnership": {
                    "type": "object",
                    "properties": {
                        "role": {"type": "string", "enum": ["owner", "representative"]},
                        "ownershipType": {"type": "string", "enum": ["mafruz", "musha"]}
                    }
                },
                "submittedDocuments": {
                    "type": "object",
                    "properties": {
                        "ownershipDeed": {
                            "type": "object",
                            "properties": {
                                "file": {"type": "string"},  # URL to uploaded file
                                "type": {"type": "string", "enum": ["booklet", "singleSheet"]}
                            }
                        },
                        "benchagh": {"type": "string"},  # URL to uploaded file
                        "buildingPermit": {
                            "type": "object",
                            "properties": {
                                "file": {"type": "string"},
                                "date": {"type": "string", "format": "date"}
                            }
                        },
                        "certificateOfNoViolation": {
                            "type": "object",
                            "properties": {
                                "file": {"type": "string"},
                                "date": {"type": "string", "format": "date"}
                            }
                        },
                        "buildingCompletionCertificate": {
                            "type": "object",
                            "properties": {
                                "file": {"type": "string"},
                                "date": {"type": "string", "format": "date"}
                            }
                        },
                        "representationDocument": {
                            "type": "object",
                            "properties": {
                                "file": {"type": "string"},
                                "type": {"type": "string", "enum": ["legal", "contractual"]}
                            }
                        },
                        "imageFiles": {
                            "type": "array",
                            "items": {"type": "string"}  # Array of URLs
                        }
                    }
                },
                "propertyRegistrationPlateNumber": {"type": "string"},
                "reviewer": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "signatureUrl": {"type": "string"},  # Digital signature image URL
                        "signatureHash": {"type": "string"},  # Signature verification hash
                        "signedBy": {"type": "string"},  # Username who signed
                        "signedAt": {"type": "string", "format": "date-time"},  # Timestamp
                        "date": {"type": "string", "format": "date"}
                    }
                }
            }
        }
    
    @classmethod
    def extract_from_workflow(cls, workflow) -> Dict[str, Any]:
        """Extract Form 1 data from workflow"""
        data = workflow.data
        
        # Build Form 1 structure from workflow data
        form_data = {
            "formTitle": cls.form_title,
            "formNumber": cls.form_number,
            "personalInformation": data.get("personalInformation", {}),
            "roleAndOwnership": data.get("roleAndOwnership", {}),
            "submittedDocuments": data.get("submittedDocuments", {}),
            "propertyRegistrationPlateNumber": data.get("propertyRegistrationPlateNumber"),
            "reviewer": data.get("reviewer", {})
        }
        
        return form_data
    
    @classmethod
    def map_to_workflow(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map Form 1 data to workflow data structure"""
        # Remove formTitle and formNumber as they're metadata
        workflow_data = form_data.copy()
        workflow_data.pop("formTitle", None)
        workflow_data.pop("formNumber", None)
        
        return workflow_data

