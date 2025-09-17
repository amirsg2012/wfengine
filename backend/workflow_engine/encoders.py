# config/encoders.py
from rest_framework.renderers import JSONRenderer
from rest_framework.utils.encoders import JSONEncoder

try:
    from bson import ObjectId  # provided by pymongo
except Exception:
    ObjectId = None

class MongoJSONEncoder(JSONEncoder):
    def default(self, obj):
        if ObjectId is not None and isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

class MongoJSONRenderer(JSONRenderer):
    encoder_class = MongoJSONEncoder
