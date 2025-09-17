# backend/apps/letters/api.py - Add these endpoints to your existing LetterViewSet
from rest_framework import viewsets, permissions, decorators, response, status
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Letter
from .serializers import LetterSerializer
from .approvals import approve_step, current_step, steps_required, step_roles
from .workflow_spec import NEXT_STATE

class LetterViewSet(viewsets.ModelViewSet):
    queryset = Letter.objects.all().order_by("-created_at")
    serializer_class = LetterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @decorators.action(detail=True, methods=["get"])
    def approval_status(self, request, pk=None):
        obj = self.get_object()
        cur = current_step(obj)
        total = steps_required(obj.state)
        data = {
            "state": obj.state,
            "next_step_index": cur if cur < total else None,
            "needed_roles": (step_roles(obj.state, cur) if cur < total else []),
            "steps_total": total,
            "will_auto_advance_on_next": (cur + 1 == total),
            "next_state_if_complete": NEXT_STATE.get(obj.state),
        }
        return response.Response(data)

    @decorators.action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        obj = self.get_object()
        res = approve_step(obj, request.user)
        if "error" in res:
            return response.Response(
                {"detail": "Forbidden", "needed_roles": res["needed_roles"]},
                status=status.HTTP_403_FORBIDDEN
            )
        if res["done"]:
            # auto-advance to next state
            moved = obj.advance_to_next(by=request.user)
            return response.Response({
                "advanced": moved,
                "new_state": obj.state,
                "next_state": NEXT_STATE.get(obj.state),
            })
        else:
            # step recorded; waiting for next ordered step
            return response.Response({
                "advanced": False,
                "state": obj.state,
                "next_step_index": res["next_step"],
                "needed_roles": step_roles(obj.state, res["next_step"]),
            })

    # ADD THESE NEW ENDPOINTS:

    @decorators.action(detail=False, methods=["get"])
    def stats(self, request):
        """Get dashboard statistics"""
        # Total letters
        total_letters = Letter.objects.count()
        
        # Pending letters (not completed)
        pending_letters = Letter.objects.exclude(state='Settlment').count()
        
        # Completed today
        today = timezone.now().date()
        completed_today = Letter.objects.filter(
            state='Settlment',
            updated_at__date=today
        ).count()
        
        # Calculate average processing time (mock for now)
        avg_processing_time = 3.5
        
        # Pending user action (mock calculation)
        pending_my_action = Letter.objects.filter(
            # Add your logic for letters pending user action
        ).count()
        
        return response.Response({
            'total_letters': total_letters,
            'pending_letters': pending_letters,
            'completed_today': completed_today,
            'avg_processing_time': avg_processing_time,
            'pending_my_action': pending_my_action
        })

    @decorators.action(detail=False, methods=["get"])
    def recent_activity(self, request):
        """Get recent activity for dashboard"""
        recent_letters = Letter.objects.order_by('-updated_at')[:10]
        
        activities = []
        for letter in recent_letters:
            time_diff = timezone.now() - letter.updated_at
            if time_diff.total_seconds() < 3600:  # Less than 1 hour
                time_str = f"{int(time_diff.total_seconds() // 60)} دقیقه پیش"
            elif time_diff.total_seconds() < 86400:  # Less than 1 day
                time_str = f"{int(time_diff.total_seconds() // 3600)} ساعت پیش"
            else:
                time_str = letter.updated_at.strftime('%Y-%m-%d')
            
            activities.append({
                'letter_id': str(letter.id),
                'title': letter.title,
                'type': 'update',  # or determine based on letter state
                'user_name': str(letter.created_by) if letter.created_by else 'سیستم',
                'created_at': letter.updated_at.isoformat()
            })
        
        return response.Response({
            'results': activities
        })

    @decorators.action(detail=False, methods=["get"])
    def reports(self, request):
        """Get report data for admin"""
        period = request.query_params.get('period', 'month')
        
        # Calculate date range based on period
        now = timezone.now()
        if period == 'week':
            start_date = now - timedelta(weeks=1)
        elif period == 'quarter':
            start_date = now - timedelta(days=90)
        elif period == 'year':
            start_date = now - timedelta(days=365)
        else:  # default to month
            start_date = now - timedelta(days=30)
        
        # Get statistics for the period
        letters_in_period = Letter.objects.filter(created_at__gte=start_date)
        
        total_letters = letters_in_period.count()
        pending_letters = letters_in_period.exclude(state='Settlment').count()
        completed_this_month = letters_in_period.filter(state='Settlment').count()
        avg_processing_time = 3.2  # Mock value
        
        return response.Response({
            'total_letters': total_letters,
            'pending_letters': pending_letters,
            'completed_this_month': completed_this_month,
            'avg_processing_time': avg_processing_time
        })
    
    
    @decorators.action(detail=False, methods=["get"])
    def recent_activity(self, request):
        """Get recent activity for dashboard"""
        limit = int(request.query_params.get('limit', 10))
        recent_letters = Letter.objects.order_by('-updated_at')[:limit]
        
        activities = []
        for letter in recent_letters:
            time_diff = timezone.now() - letter.updated_at
            if time_diff.total_seconds() < 3600:  # Less than 1 hour
                time_str = f"{int(time_diff.total_seconds() // 60)} دقیقه پیش"
            elif time_diff.total_seconds() < 86400:  # Less than 1 day
                time_str = f"{int(time_diff.total_seconds() // 3600)} ساعت پیش"
            else:
                time_str = letter.updated_at.strftime('%Y-%m-%d')
            
            # Determine activity type based on letter state or recent changes
            activity_type = 'update'
            if letter.created_at == letter.updated_at:
                activity_type = 'create'
            elif letter.state == 'Settlment':
                activity_type = 'complete'
            
            activities.append({
                'id': len(activities) + 1,
                'letter_id': str(letter.id),
                'title': letter.title,
                'type': activity_type,
                'user_name': str(letter.created_by) if letter.created_by else 'سیستم',
                'created_at': letter.updated_at.isoformat(),
                'time_display': time_str
            })
        
        return response.Response({
            'results': activities
        })
