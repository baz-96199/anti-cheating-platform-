import os
import math
import numpy as np
import cv2
from datetime import datetime, timedelta

class ProctoringEngine:
    # Event weights for calculating suspicion score (0-100)
    SEVERITY_WEIGHTS = {
        "critical": 25.0,  # e.g., mobile phone detected, multiple faces, permission revoked
        "high": 15.0,      # e.g., prolonged look away, book detected, face missing
        "medium": 8.0,     # e.g., tab switch, head deviation, fullscreen exit
        "low": 3.0         # e.g., momentary glance, blocked shortcut press
    }

    EVENT_SEVERITY_MAP = {
        "unauthorized_device": "critical",
        "cell_phone_detected": "critical",
        "prohibited_material": "high",
        "face_missing": "high",
        "face_obstructed": "high",
        "multiple_faces": "critical",
        "looking_away": "medium",
        "head_deviation": "medium",
        "camera_obstruction": "high",
        "permission_revoked": "critical",
        "fullscreen_exit": "medium",
        "tab_switch": "medium",
        "copy_paste_attempt": "low",
        "restricted_shortcut": "low"
    }

    def __init__(self, cooldown_seconds: int = 3):
        self.cooldown_seconds = cooldown_seconds
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        weights_dir = os.path.join(base_dir, "weights")

        # 1. Face Detector
        self.yunet_path = os.path.join(weights_dir, "face_detection_yunet_2023mar.onnx")
        self.face_cascade_path = os.path.join(weights_dir, "haarcascade_frontalface_default.xml")
        
        self.yunet = None
        if os.path.exists(self.yunet_path):
            try:
                self.yunet = cv2.FaceDetectorYN.create(
                    model=self.yunet_path,
                    config='',
                    input_size=(320, 240),
                    score_threshold=0.52,
                    nms_threshold=0.3,
                    top_k=10
                )
            except Exception as e:
                print(f"[ProctoringEngine] YuNet init error: {e}")

        self.face_cascade = cv2.CascadeClassifier(self.face_cascade_path) if os.path.exists(self.face_cascade_path) else None

        # 2. MediaPipe Object Detector (for cell phone / book detection)
        self.object_detector = None
        self.mp_model_path = os.path.join(weights_dir, "efficientdet_lite0.tflite")
        if os.path.exists(self.mp_model_path):
            try:
                import mediapipe as mp
                from mediapipe.tasks import python
                from mediapipe.tasks.python import vision
                
                base_options = python.BaseOptions(model_asset_path=self.mp_model_path)
                options = vision.ObjectDetectorOptions(base_options=base_options, score_threshold=0.35)
                self.object_detector = vision.ObjectDetector.create_from_options(options)
            except Exception as e:
                print(f"[ProctoringEngine] MediaPipe Object Detector init error: {e}")

    def detect_unauthorized_objects(self, frame: np.ndarray) -> list:
        """
        Scans webcam frame for unauthorized objects: mobile phones, tablets, or books.
        """
        violations = []
        if self.object_detector is None or frame is None or frame.size == 0:
            return violations

        try:
            import mediapipe as mp
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            detection_result = self.object_detector.detect(mp_image)

            for d in detection_result.detections:
                for cat in d.categories:
                    cname = cat.category_name.lower()
                    score = float(cat.score)
                    
                    if any(term in cname for term in ["cell phone", "mobile phone", "phone", "tablet"]) and score >= 0.35:
                        violations.append({
                            "event": "unauthorized_device",
                            "severity": "critical",
                            "confidence": round(score, 2),
                            "message": f"Mobile device ({cat.category_name}) detected in examination frame!"
                        })
                    elif "book" in cname and score >= 0.45:
                        violations.append({
                            "event": "prohibited_material",
                            "severity": "high",
                            "confidence": round(score, 2),
                            "message": "Physical book / unauthorized study material detected."
                        })
        except Exception as e:
            pass

        return violations

    def evaluate_head_pose_and_presence(self, frame: np.ndarray) -> dict:
        """
        Analyzes a single video frame for:
        1. Unauthorized objects (cell phone, books)
        2. Camera obstruction (near-zero variance, extreme darkness)
        3. Face presence / absence / hand-on-face obstruction
        4. Multiple faces anomaly
        5. Exact head-pose angles (yaw, pitch, roll)
        """
        if frame is None or frame.size == 0:
            return {
                "detected": False,
                "event": "camera_obstruction",
                "severity": "critical",
                "confidence": 1.0,
                "message": "Empty or black camera buffer received."
            }

        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 1. Object Detection (Cell Phone check first!)
        object_violations = self.detect_unauthorized_objects(frame)
        if len(object_violations) > 0:
            top_v = object_violations[0]
            return {
                "detected": True,
                "event": top_v["event"],
                "severity": top_v["severity"],
                "confidence": top_v["confidence"],
                "message": top_v["message"],
                "yaw": 0.0,
                "pitch": 0.0,
                "roll": 0.0
            }

        # 2. Camera Obstruction check (std dev & mean)
        std_dev = float(np.std(gray))
        mean_val = float(np.mean(gray))
        if std_dev < 12.0 and (mean_val < 25.0 or mean_val > 235.0):
            return {
                "detected": False,
                "event": "camera_obstruction",
                "severity": "high",
                "confidence": 0.95,
                "message": "Webcam lens appears completely covered or obstructed."
            }

        # 3. Face Detection & Landmark Extraction
        detected_faces = []
        if self.yunet is not None:
            try:
                self.yunet.setInputSize((w, h))
                _, faces = self.yunet.detect(frame)
                if faces is not None and len(faces) > 0:
                    for f in faces:
                        conf = float(f[14])
                        if conf >= 0.50 and float(f[2]) > 35 and float(f[3]) > 35:
                            detected_faces.append(f)
            except Exception:
                pass

        if len(detected_faces) == 0 and self.face_cascade is not None:
            faces_haar = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.15, minNeighbors=5, minSize=(50, 50)
            )
            for (hx, hy, hw, hh) in faces_haar:
                detected_faces.append([hx, hy, hw, hh, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.80])

        # A) Face Missing / Covered
        if len(detected_faces) == 0:
            return {
                "detected": False,
                "face_count": 0,
                "event": "face_missing",
                "severity": "high",
                "confidence": 0.92,
                "message": "Candidate face missing or completely covered in camera frame."
            }

        # B) Multiple Faces
        if len(detected_faces) > 1:
            return {
                "detected": True,
                "face_count": len(detected_faces),
                "event": "multiple_faces",
                "severity": "critical",
                "confidence": 0.95,
                "message": f"Multiple individuals ({len(detected_faces)}) detected in webcam view!"
            }

        # C) Single Face — Check Hand-on-Face & Head Pose
        primary = detected_faces[0]
        fx, fy, fw, fh = int(primary[0]), int(primary[1]), int(primary[2]), int(primary[3])
        fx = max(0, fx)
        fy = max(0, fy)
        fw = min(w - fx, fw)
        fh = min(h - fy, fh)

        # Texture variance check of face region (if hand covers face, variance drops)
        face_crop = gray[fy:fy+fh, fx:fx+fw]
        if face_crop.size > 0:
            crop_std = float(np.std(face_crop))
            if crop_std < 18.0:
                return {
                    "detected": True,
                    "event": "face_obstructed",
                    "severity": "high",
                    "confidence": 0.90,
                    "message": "Face appears obscured by hand or mask. Keep face fully visible."
                }

        # Calculate Head Pose from Landmarks if YuNet provided them
        re_x, re_y = float(primary[4]), float(primary[5])
        le_x, le_y = float(primary[6]), float(primary[7])
        n_x, n_y = float(primary[8]), float(primary[9])

        if re_x > 0 and le_x > 0 and n_x > 0:
            eye_dist = math.hypot(le_x - re_x, le_y - re_y)
            if eye_dist > 10:
                # 1. Yaw angle (left/right deviation)
                # Nose offset relative to the eye midpoint
                eye_mid_x = (re_x + le_x) / 2.0
                yaw_ratio = (n_x - eye_mid_x) / eye_dist
                # Yaw in degrees approx (-60 to +60)
                yaw_deg = round(float(yaw_ratio * 90.0), 1)

                # 2. Pitch angle (up/down deviation)
                eye_mid_y = (re_y + le_y) / 2.0
                pitch_ratio = (n_y - eye_mid_y) / eye_dist
                # Normal pitch ratio is ~0.45. Deviation below/above:
                pitch_deg = round(float((pitch_ratio - 0.45) * 80.0), 1)

                # 3. Roll angle (head tilt)
                roll_rad = math.atan2(le_y - re_y, le_x - re_x)
                roll_deg = round(float(math.degrees(roll_rad)), 1)

                # Check for looking away
                if abs(yaw_deg) > 24.0:
                    direction = "right" if yaw_deg < 0 else "left"
                    return {
                        "detected": True,
                        "face_count": 1,
                        "event": "looking_away",
                        "severity": "medium",
                        "confidence": 0.88,
                        "yaw": yaw_deg,
                        "pitch": pitch_deg,
                        "roll": roll_deg,
                        "message": f"Looking away from screen ({direction}, yaw: {abs(yaw_deg)}°)."
                    }

                if pitch_deg > 20.0 or pitch_deg < -22.0:
                    vert_dir = "downward" if pitch_deg > 0 else "upward"
                    return {
                        "detected": True,
                        "face_count": 1,
                        "event": "head_deviation",
                        "severity": "medium",
                        "confidence": 0.85,
                        "yaw": yaw_deg,
                        "pitch": pitch_deg,
                        "roll": roll_deg,
                        "message": f"Head tilted {vert_dir} (pitch: {pitch_deg}°)."
                    }

                # Face is present, looking straight, unobstructed
                return {
                    "detected": True,
                    "face_count": 1,
                    "event": "normal",
                    "severity": "none",
                    "confidence": 0.95,
                    "yaw": yaw_deg,
                    "pitch": pitch_deg,
                    "roll": roll_deg,
                    "message": "Student looking forward. Normal posture."
                }

        # Fallback if landmarks not detected but face bounding box was found
        # Bounding box center relative to frame center
        box_center_x = fx + fw / 2.0
        frame_center_x = w / 2.0
        norm_offset = (box_center_x - frame_center_x) / frame_center_x

        yaw_approx = round(norm_offset * 30.0, 1)
        if abs(yaw_approx) > 22.0:
            return {
                "detected": True,
                "face_count": 1,
                "event": "head_deviation",
                "severity": "medium",
                "confidence": 0.80,
                "yaw": yaw_approx,
                "pitch": 0.0,
                "roll": 0.0,
                "message": f"Head deviated significantly from frame center ({yaw_approx}°)."
            }

        return {
            "detected": True,
            "face_count": 1,
            "event": "normal",
            "severity": "none",
            "confidence": 0.90,
            "yaw": yaw_approx,
            "pitch": 0.0,
            "roll": 0.0,
            "message": "Face verified in frame."
        }

    def compute_attempt_suspicion_score(self, events: list) -> dict:
        """
        Calculates cumulative 0-100 suspicion index from logged events.
        """
        if not events:
            return {"suspicion_score": 0.0, "risk_level": "low", "total_events": 0}

        raw_score = 0.0
        event_counts = {}

        for ev in events:
            if getattr(ev, 'review_status', None) == 'dismissed':
                continue
            if isinstance(ev, dict) and ev.get('review_status') == 'dismissed':
                continue
            etype = getattr(ev, 'event_type', None) or (ev.get('event_type', '') if isinstance(ev, dict) else '')
            sev = getattr(ev, 'severity', None) or (ev.get('severity', '') if isinstance(ev, dict) else '')
            weight = self.SEVERITY_WEIGHTS.get(sev, 5.0)
            raw_score += weight
            event_counts[etype] = event_counts.get(etype, 0) + 1

        capped_score = min(100.0, round(raw_score, 1))

        if capped_score >= 60.0:
            risk = "high"
        elif capped_score >= 30.0:
            risk = "medium"
        else:
            risk = "low"

        return {
            "suspicion_score": capped_score,
            "risk_level": risk,
            "total_events": len(events),
            "event_breakdown": event_counts
        }

    def compute_suspicion_score(self, events: list) -> float:
        """Convenience method returning scalar 0-100 suspicion score."""
        return self.compute_attempt_suspicion_score(events)["suspicion_score"]

    @staticmethod
    def is_cooldown_active(last_event_time: datetime, cooldown_seconds: int = 3) -> bool:
        """Checks if minimum interval has elapsed since preceding event of same type."""
        if not last_event_time:
            return False
        return (datetime.utcnow() - last_event_time).total_seconds() < cooldown_seconds
