import os
import base64
import math
import numpy as np
import cv2
from datetime import datetime

class FaceVerificationService:
    def __init__(self, similarity_threshold: float = 0.65):
        self.similarity_threshold = similarity_threshold
        
        # Load models from backend/weights
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        weights_dir = os.path.join(base_dir, "weights")
        
        self.yunet_path = os.path.join(weights_dir, "face_detection_yunet_2023mar.onnx")
        self.face_cascade_path = os.path.join(weights_dir, "haarcascade_frontalface_default.xml")
        self.eye_cascade_path = os.path.join(weights_dir, "haarcascade_eye.xml")

        self.face_cascade = cv2.CascadeClassifier(self.face_cascade_path) if os.path.exists(self.face_cascade_path) else None
        self.eye_cascade = cv2.CascadeClassifier(self.eye_cascade_path) if os.path.exists(self.eye_cascade_path) else None

        self.yunet = None
        if os.path.exists(self.yunet_path):
            try:
                self.yunet = cv2.FaceDetectorYN.create(
                    model=self.yunet_path,
                    config='',
                    input_size=(320, 240),
                    score_threshold=0.55,
                    nms_threshold=0.3,
                    top_k=10
                )
            except Exception as e:
                print(f"[FaceService] Warning: Could not initialize YuNet: {e}")

    @staticmethod
    def decode_base64_image(base64_str: str) -> np.ndarray:
        """Decodes base64 data URL into an OpenCV BGR image."""
        if not base64_str:
            raise ValueError("Empty image data provided.")
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from base64 buffer.")
        return img

    @staticmethod
    def check_lighting_quality(image: np.ndarray) -> dict:
        """Evaluates image exposure, contrast, and focus sharpness."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mean_brightness = float(np.mean(gray))
        contrast = float(np.std(gray))
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        issues = []
        if mean_brightness < 40:
            issues.append("Lighting is too dark. Please face a light source.")
        elif mean_brightness > 230:
            issues.append("Lighting is overexposed or camera is washed out.")
        
        if contrast < 18:
            issues.append("Low contrast detected. Please adjust ambient room lighting.")
        
        if laplacian_var < 25:
            issues.append("Camera image is blurry. Please hold steady and clean camera lens.")

        return {
            "acceptable": len(issues) == 0,
            "brightness": round(mean_brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(laplacian_var, 2),
            "issues": issues
        }

    def detect_face(self, image: np.ndarray) -> dict:
        """
        Locates the primary face and verifies non-obstruction.
        Ensures hand is not covering face, eyes are visible, and face is distinct.
        """
        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        detected_faces = []

        # 1. Try YuNet DNN detector
        if self.yunet is not None:
            try:
                self.yunet.setInputSize((w, h))
                _, faces = self.yunet.detect(image)
                if faces is not None and len(faces) > 0:
                    for f in faces:
                        fx, fy, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
                        conf = float(f[14])
                        if conf >= 0.50 and fw > 40 and fh > 40:
                            landmarks = {
                                "right_eye": (float(f[4]), float(f[5])),
                                "left_eye": (float(f[6]), float(f[7])),
                                "nose": (float(f[8]), float(f[9])),
                                "right_mouth": (float(f[10]), float(f[11])),
                                "left_mouth": (float(f[12]), float(f[13]))
                            }
                            detected_faces.append({
                                "box": (fx, fy, fw, fh),
                                "confidence": conf,
                                "landmarks": landmarks
                            })
            except Exception as e:
                pass

        # 2. Fallback to Haar Cascade if YuNet found nothing
        if len(detected_faces) == 0 and self.face_cascade is not None:
            faces_haar = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.15, minNeighbors=5, minSize=(60, 60)
            )
            for (fx, fy, fw, fh) in faces_haar:
                detected_faces.append({
                    "box": (int(fx), int(fy), int(fw), int(fh)),
                    "confidence": 0.85,
                    "landmarks": None
                })

        # --- VALIDATE DETECTIONS ---
        if len(detected_faces) == 0:
            return {
                "success": False,
                "error": "No face detected in camera view. Ensure your entire face is centered and fully visible.",
                "face_count": 0
            }

        if len(detected_faces) > 1:
            return {
                "success": False,
                "error": f"Multiple faces detected ({len(detected_faces)}). Exam policy requires strictly one individual.",
                "face_count": len(detected_faces)
            }

        primary_face = detected_faces[0]
        fx, fy, fw, fh = primary_face["box"]

        # Ensure bounding box is within bounds
        fx = max(0, fx)
        fy = max(0, fy)
        fw = min(w - fx, fw)
        fh = min(h - fy, fh)

        if fw < 50 or fh < 50:
            return {
                "success": False,
                "error": "Face is positioned too far from camera. Please move closer.",
                "face_count": 1
            }

        face_roi_gray = gray[fy:fy+fh, fx:fx+fw]

        # 3. Check for Hand-on-Face / Obstruction:
        # Upper face must contain eyes or high texture variance
        upper_half = face_roi_gray[0:int(fh*0.55), :]
        if upper_half.size > 0:
            upper_std = float(np.std(upper_half))
            if upper_std < 18.0:
                return {
                    "success": False,
                    "error": "Face appears obstructed or covered (e.g. hand, cloth, or object). Please remove all obstructions.",
                    "face_count": 1
                }

        # Check eye presence if eye cascade is available
        if self.eye_cascade is not None and upper_half.size > 0:
            eyes = self.eye_cascade.detectMultiScale(upper_half, scaleFactor=1.15, minNeighbors=3, minSize=(15, 15))
            if len(eyes) == 0:
                # If neither YuNet landmarks nor eyes found, hand is likely over eyes/face
                if primary_face["landmarks"] is None:
                    return {
                        "success": False,
                        "error": "Facial features (eyes/nose) obscured. Remove your hand or obstruction from your face.",
                        "face_count": 1
                    }

        return {
            "success": True,
            "face_count": 1,
            "box": (fx, fy, fw, fh),
            "confidence": primary_face["confidence"],
            "landmarks": primary_face["landmarks"]
        }

    def extract_face_embedding(self, image: np.ndarray) -> dict:
        """
        Detects primary face, crops ROI, and extracts normalized biometric embedding.
        Rejects immediately if hand is on face, face is missing, or lighting is invalid.
        """
        # Lighting check
        quality = self.check_lighting_quality(image)
        if not quality["acceptable"]:
            return {
                "success": False,
                "error": "; ".join(quality["issues"]),
                "quality": quality
            }

        # Detect face with strict anti-obstruction rules
        det_result = self.detect_face(image)
        if not det_result["success"]:
            return {
                "success": False,
                "error": det_result["error"],
                "quality": quality,
                "face_count": det_result.get("face_count", 0)
            }

        fx, fy, fw, fh = det_result["box"]
        h, w = image.shape[:2]

        # Crop face with 12% safety margin for hairstyle and jawline context
        margin_x = int(fw * 0.12)
        margin_y = int(fh * 0.12)
        crop_x1 = max(0, fx - margin_x)
        crop_y1 = max(0, fy - margin_y)
        crop_x2 = min(w, fx + fw + margin_x)
        crop_y2 = min(h, fy + fh + margin_y)

        cropped_face = image[crop_y1:crop_y2, crop_x1:crop_x2]
        if cropped_face.size == 0:
            return {
                "success": False,
                "error": "Unable to extract valid face region.",
                "quality": quality
            }

        gray_face = cv2.cvtColor(cropped_face, cv2.COLOR_BGR2GRAY)
        face_roi = cv2.resize(gray_face, (160, 160), interpolation=cv2.INTER_AREA)
        equalized = cv2.equalizeHist(face_roi)

        # 1. Spatial cell intensity & standard deviation features (64-d)
        cell_size = 20
        grid_features = []
        for r in range(0, 160, cell_size):
            for c in range(0, 160, cell_size):
                cell = equalized[r:r+cell_size, c:c+cell_size]
                grid_features.append(float(np.mean(cell)) / 255.0)
                grid_features.append(float(np.std(cell)) / 128.0)

        # 2. Gradient Orientation Distribution (HOG) (64-d)
        gx = cv2.Sobel(equalized, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(equalized, cv2.CV_32F, 0, 1, ksize=3)
        mag, angle = cv2.cartToPolar(gx, gy, angleInDegrees=True)

        hog_features = []
        for qr in [range(0, 80), range(80, 160)]:
            for qc in [range(0, 80), range(80, 160)]:
                quad_angles = angle[np.ix_(qr, qc)]
                hist, _ = np.histogram(quad_angles, bins=16, range=(0, 360))
                hist_norm = hist / (np.sum(hist) + 1e-6)
                hog_features.extend([float(v) for v in hist_norm])

        # Concatenate and normalize (L2 norm)
        feature_vector = np.array(grid_features + hog_features, dtype=np.float32)
        norm = np.linalg.norm(feature_vector)
        if norm > 1e-6:
            feature_vector = feature_vector / norm

        return {
            "success": True,
            "embedding": feature_vector.tolist(),
            "quality": quality,
            "box": (fx, fy, fw, fh),
            "landmarks": det_result.get("landmarks"),
            "model_version": "examguard-bio-v2-dnn"
        }

    @staticmethod
    def compute_similarity(embedding_a: list, embedding_b: list) -> float:
        """Computes Cosine Similarity between two L2-normalized feature vectors."""
        if not embedding_a or not embedding_b or len(embedding_a) != len(embedding_b):
            return 0.0
        vec_a = np.array(embedding_a, dtype=np.float32)
        vec_b = np.array(embedding_b, dtype=np.float32)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a < 1e-6 or norm_b < 1e-6:
            return 0.0
        similarity = float(np.dot(vec_a, vec_b) / (norm_a * norm_b))
        return round(float(max(0.0, min(1.0, similarity))), 4)

    def verify_face(self, current_image: np.ndarray, registered_embedding: list) -> dict:
        """Verifies current webcam snapshot against enrolled biometric template."""
        extract_res = self.extract_face_embedding(current_image)
        if not extract_res["success"]:
            return {
                "verified": False,
                "similarity": 0.0,
                "threshold": self.similarity_threshold,
                "error": extract_res["error"],
                "quality": extract_res.get("quality"),
                "face_detected": False
            }

        curr_embedding = extract_res["embedding"]
        similarity = self.compute_similarity(curr_embedding, registered_embedding)
        verified = similarity >= self.similarity_threshold

        return {
            "verified": verified,
            "similarity": round(similarity, 4),
            "similarity_percentage": round(similarity * 100, 2),
            "threshold": self.similarity_threshold,
            "threshold_percentage": round(self.similarity_threshold * 100, 2),
            "quality": extract_res["quality"],
            "box": extract_res.get("box"),
            "face_detected": True,
            "status_message": "Identity successfully confirmed." if verified else f"Identity mismatch: similarity score ({round(similarity*100, 1)}%) below required threshold ({round(self.similarity_threshold*100, 1)}%)."
        }
