# apps/admin_panel/middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import UserSession


class UserSessionTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to track user sessions and update last activity
    """

    def process_request(self, request):
        if request.user.is_authenticated:
            session_key = request.session.session_key
            if session_key:
                ip_address = self.get_client_ip(request)
                user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

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
