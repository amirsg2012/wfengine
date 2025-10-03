# apps/accounts/api.py
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Membership, OrgRoleGroup, OrgRole


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
                "role_group": {
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
            "is_active": user.is_active,
            "date_joined": user.date_joined,
            "role_codes": [r["code"] for r in roles],  # easy gating in frontend
            "roles": roles                              # full labels for UI
        }
        return Response(payload)

    def patch(self, request):
        """Update user profile information"""
        user = request.user

        # Allow updating first_name, last_name, email
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')
        email = request.data.get('email')

        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if email is not None:
            user.email = email

        user.save()

        return Response({
            "detail": "اطلاعات با موفقیت به‌روزرسانی شد",
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email
        })


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {"detail": "رمز عبور فعلی و جدید الزامی است"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check current password
        if not user.check_password(current_password):
            return Response(
                {"detail": "رمز عبور فعلی اشتباه است"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate new password length
        if len(new_password) < 8:
            return Response(
                {"detail": "رمز عبور جدید باید حداقل ۸ کاراکتر باشد"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({"detail": "رمز عبور با موفقیت تغییر یافت"})


    # Admin ViewSets for managing organization structure
class OrgRoleGroupViewSet(viewsets.ModelViewSet):
    queryset = OrgRoleGroup.objects.all()
    permission_classes = [permissions.IsAdminUser]


class OrgRoleViewSet(viewsets.ModelViewSet):  
    queryset = OrgRole.objects.all()
    permission_classes = [permissions.IsAdminUser]


class MembershipViewSet(viewsets.ModelViewSet):
    queryset = Membership.objects.all()  
    permission_classes = [permissions.IsAdminUser]