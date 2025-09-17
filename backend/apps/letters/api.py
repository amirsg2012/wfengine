# apps/letters/api.py
from rest_framework import viewsets, permissions, decorators, response, status
from django.db import transaction
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
