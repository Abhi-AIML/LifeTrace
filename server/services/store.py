import time
import random
import string
import logging
from google.cloud import firestore
import server.config as config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory store fallback
_in_memory_sessions = {}

# Initialize Firestore
db = None
if config.has_firestore():
    try:
        db = firestore.Client(
            project=config.GOOGLE_CLOUD_PROJECT,
            database=config.FIRESTORE_DATABASE_ID
        )
        logger.info("Firestore client initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Firestore client: {e}. Falling back to In-Memory store.")
        db = None
else:
    logger.info("Firestore config not set. Using In-Memory store.")


def generate_session_id():
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"session_{int(time.time())}_{suffix}"


def create_session() -> str:
    session_id = generate_session_id()
    session_data = {
        "id": session_id,
        "createdAt": int(time.time() * 1000),
        "chapter": 1,
        "answers": [],
        "analysis": None,
        "status": "interview"
    }

    if db is not None:
        try:
            db.collection("sessions").document(session_id).set(session_data)
            return session_id
        except Exception as e:
            logger.error(f"Firestore set error: {e}. Writing to In-Memory fallback.")

    _in_memory_sessions[session_id] = session_data
    return session_id


def get_session(session_id: str) -> dict:
    if db is not None:
        try:
            doc = db.collection("sessions").document(session_id).get()
            if doc.exists:
                return doc.to_dict()
        except Exception as e:
            logger.error(f"Firestore get error: {e}. Reading from In-Memory fallback.")

    return _in_memory_sessions.get(session_id)


def add_answer(session_id: str, answer: dict) -> None:
    session = get_session(session_id)
    if not session:
        return

    # Add answer locally/in-memory first
    answers_list = session.get("answers", [])
    answers_list.append(answer)
    session["answers"] = answers_list

    if db is not None:
        try:
            db.collection("sessions").document(session_id).update({
                "answers": answers_list
            })
            return
        except Exception as e:
            logger.error(f"Firestore update answer error: {e}")

    _in_memory_sessions[session_id] = session


def update_chapter(session_id: str, chapter: int) -> None:
    session = get_session(session_id)
    if not session:
        return

    session["chapter"] = chapter

    if db is not None:
        try:
            db.collection("sessions").document(session_id).update({
                "chapter": chapter
            })
            return
        except Exception as e:
            logger.error(f"Firestore update chapter error: {e}")

    _in_memory_sessions[session_id] = session


def save_analysis(session_id: str, analysis: dict) -> None:
    session = get_session(session_id)
    if not session:
        return

    session["analysis"] = analysis
    session["status"] = "complete"

    if db is not None:
        try:
            db.collection("sessions").document(session_id).update({
                "analysis": analysis,
                "status": "complete"
            })
            return
        except Exception as e:
            logger.error(f"Firestore save analysis error: {e}")

    _in_memory_sessions[session_id] = session
