# apps/admin_panel/middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import UserSession


class UserSessionTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to track user sessions and update last activity.
    Works with both Django sessions and JWT authentication.
    """

    def process_request(self, request):
        if request.user.is_authenticated:
            # Get client info
            ip_address = self.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

            # Create session identifier
            # For Django sessions: use session_key
            # For JWT/stateless: create identifier from user ID + IP
            if hasattr(request, 'session') and request.session.session_key:
                session_key = request.session.session_key
            else:
                # JWT or other stateless auth - use user ID + IP combo
                session_key = f"jwt_{request.user.id}_{ip_address}"

            # Update or create user session record
            UserSession.update_session(
                user=request.user,
                session_key=session_key,
                ip_address=ip_address,
                user_agent=user_agent
            )

    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
