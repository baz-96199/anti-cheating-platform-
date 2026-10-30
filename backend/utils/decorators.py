from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from backend.models.user import User

def role_required(*allowed_roles):
    """
    Decorator that verifies JWT authentication and enforces role-based access control.
    Also verifies account status (active vs suspended or pending approval).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            # user_id is stored as integer or string
            try:
                user_id = int(user_id)
            except Exception:
                pass
            user = User.query.get(user_id)
            if not user:
                return jsonify({"error": "User account not found or deactivated."}), 401

            if user.status == 'suspended':
                return jsonify({"error": "Your account has been suspended by an administrator."}), 403

            if user.role == 'teacher' and user.status == 'pending_approval':
                return jsonify({"error": "Your teacher account is pending administrator approval."}), 403

            if allowed_roles and user.role not in allowed_roles:
                return jsonify({"error": f"Access forbidden. Required role: {', '.join(allowed_roles)}."}), 403

            # Pass current_user to route handler
            return fn(*args, current_user=user, **kwargs)
        return wrapper
    return decorator
