from flask import Blueprint, request, jsonify
from backend.extensions import db
from backend.models.notification import Notification
from backend.utils.decorators import role_required

notification_bp = Blueprint('notification_bp', __name__)

@notification_bp.route('', methods=['GET'])
@role_required()
def list_notifications(current_user):
    limit = int(request.args.get('limit', 20))
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).limit(limit).all()
    unread_count = Notification.query.filter_by(user_id=current_user.id, is_read=False).count()

    return jsonify({
        "unread_count": unread_count,
        "notifications": [n.to_dict() for n in notifs]
    }), 200

@notification_bp.route('/<int:notif_id>/read', methods=['POST'])
@role_required()
def mark_read(notif_id, current_user):
    notif = Notification.query.filter_by(id=notif_id, user_id=current_user.id).first()
    if notif:
        notif.is_read = True
        db.session.commit()
    return jsonify({"success": True}), 200

@notification_bp.route('/read-all', methods=['POST'])
@role_required()
def mark_all_read(current_user):
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"success": True}), 200
