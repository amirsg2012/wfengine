# apps/letters/serializers.py
from rest_framework import serializers
from .models import Letter

class LetterSerializer(serializers.ModelSerializer):
    # Always string id
    id = serializers.SerializerMethodField(read_only=True)
    # created_by as the raw PK string (or swap for a tiny object if you prefer)
    created_by = serializers.CharField(source="created_by_id", read_only=True)

    class Meta:
        model = Letter
        fields = ["id", "title", "body", "attachment", "state",
                  "created_by", "created_at", "updated_at"]
        read_only_fields = ["state", "created_by", "created_at", "updated_at"]

    def get_id(self, obj):
        return str(obj.pk)
