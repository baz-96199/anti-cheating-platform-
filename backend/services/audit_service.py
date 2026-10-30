from flask import request
from backend.extensions import db
from backend.models.audit_log import AuditLog

class AuditService:
    @staticmethod
    def log(user_id: int, action: str, resource_type: str, resource_id: str = None, details: dict = None):
        """Creates an audit log entry for security and accountability tracking."""
        ip = request.remote_addr if request else "127.0.0.1"
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            ip_address=ip
        )
        if details:
            log_entry.set_details(details)
        db.session.add(log_entry)
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
