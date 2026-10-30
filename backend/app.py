import os
from flask import Flask, jsonify
from backend.config import Config
from backend.extensions import db, migrate, jwt, cors

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Ensure uploads directory exists
    os.makedirs(app.config.get("UPLOAD_FOLDER", "uploads"), exist_ok=True)

    # Initialize Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}})

    # JWT Error handlers
    @jwt.unauthorized_loader
    def unauthorized_callback(callback):
        return jsonify({"error": "Missing authorization token in request header."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(callback):
        return jsonify({"error": "Invalid or malformed authorization token."}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Authorization token has expired. Please log in again."}), 401

    # Root & Health Meta endpoints
    @app.route('/', methods=['GET'])
    def root():
        from flask import request, render_template_string
        if 'text/html' in request.headers.get('Accept', ''):
            html = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>ExamGuard AI Backend API</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #090d16; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
                    .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 40px; max-width: 580px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; }
                    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
                    .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; box-shadow: 0 0 10px #10b981; }
                    h1 { margin: 0 0 10px; font-size: 26px; font-weight: 800; color: #ffffff; }
                    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
                    .btn-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
                    .btn-primary { background: #4f46e5; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3); }
                    .btn-primary:hover { background: #4338ca; transform: translateY(-1px); }
                    .btn-secondary { background: #1e293b; color: #cbd5e1; padding: 12px 20px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid #334155; }
                    .btn-secondary:hover { background: #334155; color: white; }
                    .info-box { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin-top: 24px; text-align: left; font-size: 12px; color: #64748b; }
                    .info-box code { color: #38bdf8; font-family: monospace; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="badge"><span class="dot"></span> Backend API Online</div>
                    <h1>ExamGuard AI API Server</h1>
                    <p>The backend REST service is running on <strong>port 5000</strong>. The user-facing web dashboard is served through the Vite development server on <strong>port 5173</strong>.</p>
                    <div class="btn-group">
                        <a href="http://localhost:5173" class="btn-primary" target="_blank">Open Web Dashboard (Port 5173) &rarr;</a>
                        <a href="/api/health" class="btn-secondary">Check Health Endpoint</a>
                    </div>
                    <div class="info-box">
                        <strong>Quick Navigation:</strong><br>
                        • Web UI: <a href="http://localhost:5173" style="color:#818cf8;">http://localhost:5173</a><br>
                        • API Base: <code>http://127.0.0.1:5000/api</code><br>
                        • Health Check: <code>http://127.0.0.1:5000/api/health</code>
                    </div>
                </div>
            </body>
            </html>
            """
            return render_template_string(html)
        return jsonify({
            "status": "online",
            "service": "ExamGuard AI Backend API",
            "frontend_url": "http://localhost:5173",
            "health_check": "/api/health"
        }), 200

    @app.route('/api/health', methods=['GET'])
    def health_check():
        from backend.services.gemini_service import GeminiQuizService
        gemini_configured = GeminiQuizService().is_configured()
        return jsonify({
            "status": "healthy",
            "service": "ExamGuard AI Backend API",
            "gemini_ai_configured": gemini_configured,
            "biometrics_engine": "MediaPipe & OpenCV Hybrid",
            "database_driver": app.config['SQLALCHEMY_DATABASE_URI'].split('://')[0]
        }), 200

    # Register Blueprints
    from backend.api.auth_routes import auth_bp
    from backend.api.face_routes import face_bp
    from backend.api.exam_routes import exam_bp
    from backend.api.proctoring_routes import proctoring_bp
    from backend.api.student_routes import student_bp
    from backend.api.teacher_routes import teacher_bp
    from backend.api.admin_routes import admin_bp
    from backend.api.report_routes import report_bp
    from backend.api.notification_routes import notification_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(face_bp, url_prefix='/api/face')
    app.register_blueprint(exam_bp, url_prefix='/api/exam')
    app.register_blueprint(proctoring_bp, url_prefix='/api/proctoring')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(teacher_bp, url_prefix='/api/teacher')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(report_bp, url_prefix='/api/reports')
    app.register_blueprint(notification_bp, url_prefix='/api/notifications')

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "The requested API endpoint was not found."}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "An internal server error occurred."}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    # Auto-create tables if running directly
    with app.app_context():
        db.create_all()
    port = int(os.getenv("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
