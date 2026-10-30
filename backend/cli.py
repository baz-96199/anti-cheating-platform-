import argparse
from datetime import datetime, timedelta
from backend.app import create_app
from backend.extensions import db
from backend.models.user import User
from backend.models.profile import StudentProfile, TeacherProfile
from backend.models.academic import Course, Subject
from backend.models.exam import Exam
from backend.models.question import Question, AnswerOption
from backend.models.attempt import ExamAttempt
from backend.models.student_answer import StudentAnswer
from backend.models.proctoring_event import ProctoringEvent
from backend.models.face_template import FaceTemplate
from backend.models.notification import Notification

def init_db():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("[ExamGuard CLI] Database schema initialized successfully.")

def create_admin(email, password, name):
    app = create_app()
    with app.app_context():
        db.create_all()
        existing = User.query.filter_by(email=email).first()
        if existing:
            print(f"[ExamGuard CLI] User with email '{email}' already exists.")
            return

        admin = User(
            email=email,
            name=name,
            role='admin',
            status='active',
            is_verified=True
        )
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        print(f"[ExamGuard CLI] Administrator account created successfully: {email}")

def seed_demo_data():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("[ExamGuard CLI] Seeding realistic demonstration data...")

        # 1. Admin
        admin = User.query.filter_by(email='admin@examguard.ai').first()
        if not admin:
            admin = User(
                email='admin@examguard.ai',
                name='Dr. Elena Vance (System Admin)',
                role='admin',
                status='active',
                is_verified=True
            )
            admin.set_password('Admin@12345')
            db.session.add(admin)

        # 2. Approved Teacher
        teacher = User.query.filter_by(email='prof.smith@examguard.ai').first()
        if not teacher:
            teacher = User(
                email='prof.smith@examguard.ai',
                name='Prof. Arthur Smith',
                role='teacher',
                status='active',
                is_verified=True
            )
            teacher.set_password('Teacher@12345')
            db.session.add(teacher)
            db.session.flush()

            t_prof = TeacherProfile(
                user_id=teacher.id,
                teacher_id='TCH-8801',
                designation='Senior Professor & AI Chair',
                department='Computer Science & Engineering',
                qualification='Ph.D. in Computer Vision',
                approval_status='approved',
                approved_at=datetime.utcnow()
            )
            db.session.add(t_prof)

        # 3. Pending Teacher (for admin approval demonstration)
        pending_teacher = User.query.filter_by(email='dr.clara@examguard.ai').first()
        if not pending_teacher:
            pending_teacher = User(
                email='dr.clara@examguard.ai',
                name='Dr. Clara Oswald',
                role='teacher',
                status='pending_approval',
                is_verified=False
            )
            pending_teacher.set_password('Teacher@12345')
            db.session.add(pending_teacher)
            db.session.flush()

            pt_prof = TeacherProfile(
                user_id=pending_teacher.id,
                teacher_id='TCH-9942',
                designation='Assistant Professor',
                department='Information Technology',
                qualification='Ph.D. in Cyber Security',
                approval_status='pending'
            )
            db.session.add(pt_prof)

        # 4. Student
        student = User.query.filter_by(email='student.alex@examguard.ai').first()
        if not student:
            student = User(
                email='student.alex@examguard.ai',
                name='Alex Mercer',
                role='student',
                status='active',
                is_verified=True
            )
            student.set_password('Student@12345')
            db.session.add(student)
            db.session.flush()

            s_prof = StudentProfile(
                user_id=student.id,
                student_id='STU-2026-042',
                course='B.Tech Computer Science & Engineering',
                department='School of Computing',
                semester='Semester 6',
                face_registered=True,
                face_updated_at=datetime.utcnow()
            )
            db.session.add(s_prof)

            # Sample face embedding for student
            # Generate deterministic normalized 128-d vector
            dummy_embedding = [round(0.08 * (i % 7) - 0.2, 4) for i in range(128)]
            ft = FaceTemplate(
                user_id=student.id,
                consent_given=True,
                consent_timestamp=datetime.utcnow(),
                model_version='examguard-bio-v1-hybrid',
                is_active=True
            )
            ft.set_embedding(dummy_embedding)
            db.session.add(ft)

        # 5. Course & Subject
        course = Course.query.filter_by(code='CSE-401').first()
        if not course:
            course = Course(
                code='CSE-401',
                name='B.Tech Computer Science and Engineering',
                department='School of Computing'
            )
            db.session.add(course)
            db.session.flush()

        subject = Subject.query.filter_by(code='CS-420').first()
        if not subject:
            subject = Subject(
                code='CS-420',
                name='Advanced Algorithms & AI Engineering',
                course_id=course.id
            )
            db.session.add(subject)
            db.session.flush()

        # 6. Sample Live Exam
        exam = Exam.query.filter_by(exam_code='AI2026').first()
        if not exam:
            exam = Exam(
                title='Midterm Assessment: Algorithms & Ethical AI',
                description='Comprehensive proctored assessment testing algorithmic correctness, asymptotic complexity, and ethical anti-cheating principles.',
                exam_code='AI2026',
                teacher_id=teacher.id,
                course_id=course.id,
                subject_id=subject.id,
                duration_minutes=45,
                start_time=datetime.utcnow() - timedelta(hours=2),
                end_time=datetime.utcnow() + timedelta(days=14),
                total_marks=20.0,
                passing_percentage=40.0,
                negative_marking=True,
                negative_mark_value=0.5,
                randomize_questions=True,
                randomize_options=True,
                require_face_verification=True,
                warning_limit=5,
                auto_submit_on_violations=True,
                enable_head_pose_detection=True,
                enable_tab_switch_detection=True,
                enable_fullscreen_lock=True,
                show_result_immediately=True,
                allow_review_requests=True,
                is_published=True,
                status='published'
            )
            db.session.add(exam)
            db.session.flush()

            # Questions
            sample_questions = [
                {
                    "text": "What is the tight worst-case time complexity of standard QuickSort with randomized pivot selection?",
                    "type": "mcq",
                    "marks": 4.0,
                    "explanation": "Randomized pivot selection yields O(n log n) expected time, but the theoretical worst-case remains O(n^2) when adversarial partitions occur.",
                    "topic": "Sorting & Complexity",
                    "options": [
                        {"text": "O(n log n) expected, but O(n^2) theoretical worst-case", "correct": True},
                        {"text": "Strict O(log n) worst-case", "correct": False},
                        {"text": "O(n) linear deterministic time", "correct": False},
                        {"text": "O(n^3) cubic time", "correct": False}
                    ]
                },
                {
                    "text": "In biometric verification, Cosine Similarity compares the direction of normalized embedding vectors rather than their magnitude.",
                    "type": "true_false",
                    "marks": 4.0,
                    "explanation": "True. L2-normalized cosine similarity evaluates the angular difference between vectors, making it robust against scale variations.",
                    "topic": "Biometrics & Computer Vision",
                    "options": [
                        {"text": "True", "correct": True},
                        {"text": "False", "correct": False}
                    ]
                },
                {
                    "text": "Which algorithm is guaranteed to find the shortest path in a graph with non-negative edge weights in O((V + E) log V) time?",
                    "type": "mcq",
                    "marks": 4.0,
                    "explanation": "Dijkstra's Algorithm implemented with a Min-Priority Heap operates in O((V + E) log V) time.",
                    "topic": "Graph Algorithms",
                    "options": [
                        {"text": "Dijkstra's Algorithm with Min-Heap", "correct": True},
                        {"text": "Bellman-Ford Algorithm", "correct": False},
                        {"text": "Floyd-Warshall Algorithm", "correct": False},
                        {"text": "Depth First Search (DFS)", "correct": False}
                    ]
                },
                {
                    "text": "In online proctoring architectures, head-pose estimation uses yaw, pitch, and roll angles to distinguish natural glances from sustained misconduct.",
                    "type": "true_false",
                    "marks": 4.0,
                    "explanation": "True. Continuous head-pose tracking relies on temporal thresholds to prevent momentary involuntary head motions from falsely triggering penalties.",
                    "topic": "AI Proctoring",
                    "options": [
                        {"text": "True", "correct": True},
                        {"text": "False", "correct": False}
                    ]
                },
                {
                    "text": "What is the primary role of a server-side JWT or session authentication check on every protected examination endpoint?",
                    "type": "mcq",
                    "marks": 4.0,
                    "explanation": "Client-side validation can be bypassed; the backend must independently verify permissions, ownership, and role on each call.",
                    "topic": "Application Security",
                    "options": [
                        {"text": "To guarantee authorization and prevent unauthorized tampering regardless of frontend code", "correct": True},
                        {"text": "To compress image files before sending to browser", "correct": False},
                        {"text": "To increase browser rendering refresh rates", "correct": False},
                        {"text": "To format SQL queries into HTML tables", "correct": False}
                    ]
                }
            ]

            for q_data in sample_questions:
                q = Question(
                    exam_id=exam.id,
                    question_text=q_data["text"],
                    question_type=q_data["type"],
                    marks=q_data["marks"],
                    explanation=q_data["explanation"],
                    topic=q_data["topic"],
                    difficulty="medium"
                )
                db.session.add(q)
                db.session.flush()

                for idx, opt in enumerate(q_data["options"]):
                    ans_opt = AnswerOption(
                        question_id=q.id,
                        option_text=opt["text"],
                        is_correct=opt["correct"],
                        order_idx=idx
                    )
                    db.session.add(ans_opt)

        # 7. Live Available Exam (Ready for student to take immediately)
        exam_live = Exam.query.filter_by(exam_code='FINAL2026').first()
        if not exam_live:
            exam_live = Exam(
                title='Practical Examination: AI Systems & Cloud Security',
                description='Live final semester assessment covering anti-cheating mechanisms, neural networks, and secure distributed protocols.',
                exam_code='FINAL2026',
                teacher_id=teacher.id,
                course_id=course.id,
                subject_id=subject.id,
                duration_minutes=30,
                start_time=datetime.utcnow() - timedelta(hours=1),
                end_time=datetime.utcnow() + timedelta(days=14),
                total_marks=20.0,
                passing_percentage=50.0,
                negative_marking=True,
                negative_mark_value=0.5,
                randomize_questions=True,
                randomize_options=True,
                require_face_verification=True,
                warning_limit=5,
                auto_submit_on_violations=True,
                enable_head_pose_detection=True,
                enable_tab_switch_detection=True,
                enable_fullscreen_lock=True,
                show_result_immediately=True,
                allow_review_requests=True,
                is_published=True,
                status='published'
            )
            db.session.add(exam_live)
            db.session.flush()

            live_questions = [
                {
                    "text": "What is the primary purpose of computing yaw, pitch, and roll in head-pose proctoring?",
                    "type": "mcq",
                    "marks": 5.0,
                    "explanation": "Yaw, pitch, and roll rotation angles measure 3D head orientation relative to the camera, distinguishing minor natural adjustments from deliberate looking away.",
                    "topic": "Computer Vision Proctoring",
                    "options": [
                        {"text": "To determine 3D head rotation angles and detect looking away from the display", "correct": True},
                        {"text": "To adjust screen brightness automatically", "correct": False},
                        {"text": "To compress webcam video streams for network efficiency", "correct": False},
                        {"text": "To calculate typing speed on the keyboard", "correct": False}
                    ]
                },
                {
                    "text": "In zero-trust exam proctoring, all critical evaluations (answer checking, score calculation, and time limits) must be enforced on the server.",
                    "type": "true_false",
                    "marks": 5.0,
                    "explanation": "True. Frontend validation can be manipulated via browser developer tools; server-side enforcement ensures integrity.",
                    "topic": "System Security",
                    "options": [
                        {"text": "True", "correct": True},
                        {"text": "False", "correct": False}
                    ]
                },
                {
                    "text": "Which biometric similarity metric measures the angle between two face embedding vectors regardless of their magnitude?",
                    "type": "mcq",
                    "marks": 5.0,
                    "explanation": "Cosine Similarity measures the cosine of the angle between two multi-dimensional feature vectors.",
                    "topic": "Biometrics",
                    "options": [
                        {"text": "Cosine Similarity", "correct": True},
                        {"text": "Manhattan Distance", "correct": False},
                        {"text": "Hamming Distance", "correct": False},
                        {"text": "Jaccard Index", "correct": False}
                    ]
                },
                {
                    "text": "Why should anti-cheating platforms implement cooldown intervals and temporal thresholds on proctoring warnings?",
                    "type": "mcq",
                    "marks": 5.0,
                    "explanation": "Cooldown intervals prevent temporary jitter, lighting flickers, or natural blinks from generating excessive duplicate violation penalties.",
                    "topic": "Proctoring Ergonomics",
                    "options": [
                        {"text": "To avoid spamming students with duplicate penalties for brief natural movements", "correct": True},
                        {"text": "To reduce database storage by deleting all logs", "correct": False},
                        {"text": "To allow students to open another browser tab without detection", "correct": False},
                        {"text": "To turn off the camera after each question", "correct": False}
                    ]
                }
            ]

            for q_data in live_questions:
                q = Question(
                    exam_id=exam_live.id,
                    question_text=q_data["text"],
                    question_type=q_data["type"],
                    marks=q_data["marks"],
                    explanation=q_data["explanation"],
                    topic=q_data["topic"],
                    difficulty="medium"
                )
                db.session.add(q)
                db.session.flush()

                for idx, opt in enumerate(q_data["options"]):
                    ans_opt = AnswerOption(
                        question_id=q.id,
                        option_text=opt["text"],
                        is_correct=opt["correct"],
                        order_idx=idx
                    )
                    db.session.add(ans_opt)

        # 8. Completed Attempt for Alex Mercer with realistic proctoring events
        existing_attempt = ExamAttempt.query.filter_by(student_id=student.id, exam_id=exam.id).first()
        if not existing_attempt:
            att = ExamAttempt(
                exam_id=exam.id,
                student_id=student.id,
                status='evaluated',
                start_time=datetime.utcnow() - timedelta(minutes=40),
                submitted_at=datetime.utcnow() - timedelta(minutes=10),
                time_spent_seconds=1800,
                total_score=16.0,
                percentage=80.0,
                is_passed=True,
                auto_submitted=False,
                face_verification_passed=True,
                face_similarity_score=0.91,
                face_verified_at=datetime.utcnow() - timedelta(minutes=41),
                violation_count=2,
                suspicion_score=21.4,
                review_status='explained',
                teacher_remarks='Student momentarily looked aside; brief explanation verified.',
                ip_address='127.0.0.1'
            )
            db.session.add(att)
            db.session.flush()

            # Proctoring event samples
            ev1 = ProctoringEvent(
                attempt_id=att.id,
                event_type='head_deviation',
                severity='medium',
                confidence=0.88,
                duration_seconds=2.5,
                timestamp=datetime.utcnow() - timedelta(minutes=25)
            )
            ev1.set_details({"message": "Head turned right (yaw: 34.2°)", "yaw": 34.2, "pitch": 5.1})
            db.session.add(ev1)

            ev2 = ProctoringEvent(
                attempt_id=att.id,
                event_type='tab_switch',
                severity='medium',
                confidence=1.0,
                duration_seconds=1.2,
                timestamp=datetime.utcnow() - timedelta(minutes=18)
            )
            ev2.set_details({"message": "Browser document visibility changed to hidden."})
            db.session.add(ev2)

        # 8. Notifications
        n1 = Notification(
            user_id=student.id,
            title="Exam Available: AI2026",
            message="Your Midterm Assessment in Algorithms & Ethical AI is published and ready.",
            type="exam"
        )
        db.session.add(n1)

        db.session.commit()
        print("[ExamGuard CLI] Demo data seeded successfully!")
        print("--------------------------------------------------")
        print("ADMIN CREDENTIALS:    admin@examguard.ai / Admin@12345")
        print("TEACHER CREDENTIALS:  prof.smith@examguard.ai / Teacher@12345")
        print("PENDING TEACHER:      dr.clara@examguard.ai / Teacher@12345")
        print("STUDENT CREDENTIALS:  student.alex@examguard.ai / Student@12345")
        print("EXAM CODE:            AI2026")
        print("--------------------------------------------------")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ExamGuard AI Management CLI")
    subparsers = parser.add_subparsers(dest="command")

    # init-db
    subparsers.add_parser("init-db", help="Initialize database schema")

    # create-admin
    admin_parser = subparsers.add_parser("create-admin", help="Create a new administrator account")
    admin_parser.add_argument("--email", required=True, help="Admin email address")
    admin_parser.add_argument("--password", required=True, help="Admin password")
    admin_parser.add_argument("--name", default="System Administrator", help="Admin display name")

    # seed-demo-data
    subparsers.add_parser("seed-demo-data", help="Seed realistic initial records and exams")

    args = parser.parse_args()
    if args.command == "init-db":
        init_db()
    elif args.command == "create-admin":
        create_admin(args.email, args.password, args.name)
    elif args.command == "seed-demo-data":
        seed_demo_data()
    else:
        parser.print_help()
