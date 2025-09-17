# config/drf_mongo.py
from rest_framework.serializers import ModelSerializer
from rest_framework import serializers

try:
    from django_mongodb_backend.fields import ObjectIdField, ObjectIdAutoField
except Exception:
    # If import path differs in your backend version, adjust here.
    # Common alternatives:
    # from django_mongodb_engine.fields import ObjectIdField  # older libs
    raise

# Map Mongo ObjectId fields to string serializer fields
ModelSerializer.serializer_field_mapping[ObjectIdField] = serializers.CharField
ModelSerializer.serializer_field_mapping[ObjectIdAutoField] = serializers.CharField
