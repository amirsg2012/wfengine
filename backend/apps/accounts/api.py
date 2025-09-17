from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Membership


class AuthView(APIView):
    permission_classes = []

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if not user:
            return Response({"detail":"Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh)})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Avoid prefetch/select_related on Mongo; do simple lookups
        memberships = Membership.objects.filter(user=user)

        roles = []
        for m in memberships:
            role = m.role         # hits Mongo; fine at our scale
            group = role.group    # another small lookup
            roles.append({
                "code": role.code,
                "name_fa": role.name_fa,
                "group": {
                    "code": group.code,
                    "name_fa": group.name_fa,
                }
            })

        payload = {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "role_codes": [r["code"] for r in roles],  # easy gating in frontend
            "roles": roles                              # full labels for UI
        }
        return Response(payload)