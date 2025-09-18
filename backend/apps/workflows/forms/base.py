# apps/workflows/forms/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime
from django.core.exceptions import ValidationError

class BaseWorkflowForm(ABC):
    """Base class for all workflow forms"""
    
    form_number: int
    form_title: str
    
    @classmethod
    @abstractmethod
    def get_schema(cls) -> Dict[str, Any]:
        """Return the JSON schema for this form"""
        pass
    
    @classmethod
    @abstractmethod
    def extract_from_workflow(cls, workflow) -> Dict[str, Any]:
        """Extract form data from workflow instance"""
        pass
    
    @classmethod
    @abstractmethod
    def map_to_workflow(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map form data to workflow data structure"""
        pass
    
    @classmethod
    def validate(cls, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate form data and return errors"""
        errors = {}
        schema = cls.get_schema()
        
        # Basic validation logic here
        # You can extend this with more sophisticated validation
        
        return errors
    
    @classmethod
    def get_computed_fields(cls, workflow_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate computed/derived fields"""
        return {}


