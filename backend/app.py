import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd
import shap
from flask import Flask, jsonify, request
from flask_cors import CORS
from mysql.connector import Error, connect
from dotenv import load_dotenv
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sentence_transformers import SentenceTransformer  # ADDED

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
DATA_PATH = os.path.join(BASE_DIR, "data", "adhd_model_ready.csv")
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

MODEL_PATH = os.path.join(MODEL_DIR, "adhd_model_final.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "features.pkl")
ASRS_FEATURES = [f"asrs1_item_{i}" for i in range(1, 19)]

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "aimdb"),
}

QUESTION_TEXT = [
    "Trouble finishing tasks after challenging parts are done",
    "Difficulty organizing tasks and activities",
    "Forget appointments or obligations",
    "Avoid tasks requiring sustained mental effort",
    "Fidget or feel restless",
    "Feel overly active or driven by a motor",
    "Make careless mistakes in daily activities",
    "Difficulty sustaining attention",
    "Seem not to listen when spoken to directly",
    "Lose things necessary for tasks",
    "Easily distracted",
    "Forgetful in daily routines",
    "Interrupt others while they are speaking",
    "Hard to wait your turn",
    "Talk excessively",
    "Feel impatient",
    "Struggle to relax",
    "Feel overwhelmed by responsibilities",
]

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

model = None
feature_names = ASRS_FEATURES.copy()
explainer = None
_embedding_model = None  # ADDED


def db_connection():
    try:
        return connect(**DB_CONFIG)
    except Error:
        return None


def bootstrap_database():
    conn = db_connection()
    if conn is None:
        return False

    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(120) NOT NULL,
                email VARCHAR(190) UNIQUE NOT NULL,
                password VARCHAR(190) NOT NULL,
                created_at DATETIME NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS assessments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                score INT NOT NULL,
                percentage FLOAT NOT NULL,
                predicted_label VARCHAR(30) NOT NULL,
                adhd_probability FLOAT NOT NULL,
                top_factor_1 VARCHAR(255) NULL,
                top_factor_2 VARCHAR(255) NULL,
                top_factor_3 VARCHAR(255) NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
            """
        )
        conn.commit()
        return True
    finally:
        conn.close()


def train_or_load_model():
    global model, feature_names, explainer

    os.makedirs(MODEL_DIR, exist_ok=True)
    should_retrain = True
    if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
        model = joblib.load(MODEL_PATH)
        feature_names = joblib.load(FEATURES_PATH)

        # Ensure old artifacts are compatible with current 18-question frontend flow.
        if (
            isinstance(feature_names, list)
            and len(feature_names) == len(ASRS_FEATURES)
            and set(feature_names) == set(ASRS_FEATURES)
        ):
            should_retrain = False

    if should_retrain:
        df = pd.read_csv(DATA_PATH)
        feature_names = ASRS_FEATURES.copy()
        X = df[feature_names]
        y = df["ADHD_label"].astype(int)

        X_train, _, y_train, _ = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        model = RandomForestClassifier(
            n_estimators=200, random_state=42, class_weight="balanced"
        )
        model.fit(X_train, y_train)

        joblib.dump(model, MODEL_PATH)
        joblib.dump(feature_names, FEATURES_PATH)

    explainer = shap.TreeExplainer(model)


# ADDED: loads the same embedding model used by rag/scripts/config.py,
# once at startup, so /embed requests are fast (no per-request model load).
def load_embedding_model():
    global _embedding_model
    _embedding_model = SentenceTransformer("BAAI/bge-base-en-v1.5")


def top_shap_factors(input_df):
    values = explainer.shap_values(input_df)
    if isinstance(values, list):
        shap_for_class_1 = values[1][0]
    else:
        arr = np.array(values)
        if arr.ndim == 3:
            shap_for_class_1 = arr[0, :, 1]
        else:
            shap_for_class_1 = arr[0]

    factors = []
    for i, feature in enumerate(feature_names):
        idx = int(feature.split("_")[-1]) - 1
        factors.append(
            {
                "feature": feature,
                "question": QUESTION_TEXT[idx] if idx < len(QUESTION_TEXT) else feature,
                "answer_value": int(input_df.iloc[0][feature]),
                "impact": float(shap_for_class_1[i]),
                "abs_impact": float(abs(shap_for_class_1[i])),
            }
        )

    factors.sort(key=lambda x: x["abs_impact"], reverse=True)
    return factors[:3]


@app.get("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "model_loaded": model is not None,
            "db_connected": db_connection() is not None,
            "embedding_model_loaded": _embedding_model is not None,  # ADDED
        }
    )


# ADDED: embedding endpoint used by backend/services/ai/rag/embeddings.js
@app.post("/embed")
def embed():
    body = request.get_json(silent=True) or {}
    text = body.get("text")

    if not text or not isinstance(text, str):
        return jsonify({"error": "'text' (string) is required"}), 400

    if _embedding_model is None:
        return jsonify({"error": "Embedding model is not loaded"}), 503

    vector = _embedding_model.encode(
        text,
        normalize_embeddings=True,  # must match rag/scripts/embed_and_upsert.py
    )

    return jsonify({"embedding": vector.tolist()})


@app.post("/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "full_name, email and password are required"}), 400

    conn = db_connection()
    if conn is None:
        return jsonify({"error": "Database is not reachable"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already registered"}), 409

        cursor.execute(
            """
            INSERT INTO users (full_name, email, password, created_at)
            VALUES (%s, %s, %s, %s)
            """,
            (full_name, email, password, datetime.utcnow()),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({"user": {"id": user_id, "full_name": full_name, "email": email}})
    finally:
        conn.close()


@app.post("/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    conn = db_connection()
    if conn is None:
        return jsonify({"error": "Database is not reachable"}), 500

    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, full_name, email FROM users WHERE email = %s AND password = %s",
            (email, password),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify({"user": user})
    finally:
        conn.close()


@app.post("/detection/predict")
def predict():
    try:
        data = request.get_json(silent=True) or {}
        answers = data.get("answers")
        user_id = data.get("user_id")

        if not isinstance(answers, list) or len(answers) != 18:
            return jsonify({"error": "answers must be an array of 18 integers (0-4)"}), 400

        try:
            parsed = [max(0, min(4, int(value))) for value in answers]
        except (TypeError, ValueError):
            return jsonify({"error": "All answers must be numeric values"}), 400

        row = {ASRS_FEATURES[i]: parsed[i] for i in range(18)}
        input_df = pd.DataFrame([row], columns=ASRS_FEATURES)

        prediction = int(model.predict(input_df)[0])
        probability = float(model.predict_proba(input_df)[0][1])
        score = int(sum(parsed))
        percentage = round((score / (18 * 4)) * 100, 2)
        factors = top_shap_factors(input_df)
        predicted_label = "ADHD" if prediction == 1 else "Non-ADHD"

        conn = db_connection()
        if conn is not None:
            try:
                cursor = conn.cursor()
                top1 = factors[0]["question"] if len(factors) > 0 else None
                top2 = factors[1]["question"] if len(factors) > 1 else None
                top3 = factors[2]["question"] if len(factors) > 2 else None
                cursor.execute(
                    """
                    INSERT INTO assessments (
                        user_id, score, percentage, predicted_label, adhd_probability,
                        top_factor_1, top_factor_2, top_factor_3, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        score,
                        percentage,
                        predicted_label,
                        probability,
                        top1,
                        top2,
                        top3,
                        datetime.utcnow(),
                    ),
                )
                conn.commit()
            finally:
                conn.close()

        return jsonify(
            {
                "score": score,
                "max_score": 72,
                "percentage": percentage,
                "prediction": prediction,
                "predicted_label": predicted_label,
                "adhd_probability": probability,
                "top_factors": factors,
            }
        )
    except Exception as error:
        return jsonify({"error": f"Prediction failed: {str(error)}"}), 500


bootstrap_database()
train_or_load_model()
load_embedding_model()  # ADDED


if __name__ == "__main__":
    # Force port 5001 and ignore the .env file's PORT variable
    app.run(host="0.0.0.0", port=5001)
