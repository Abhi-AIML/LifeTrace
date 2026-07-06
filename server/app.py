import os
import time
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import server.config as config
import server.services.store as store
import server.services.vector as vector
import server.services.gemini as gemini

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
# static_folder is "../public" relative to server/app.py
public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public"))
app = Flask(__name__, static_folder=public_dir, static_url_path="")
CORS(app)

# Health Check - Required for Google Cloud Run
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "environment": config.FLASK_ENV})

# API: Start Session
@app.route('/api/session/start', methods=['POST'])
def start_session():
    try:
        session_id = store.create_session()
        logger.info(f"Started new session: {session_id}")
        return jsonify({"sessionId": session_id})
    except Exception as e:
        logger.error(f"Error starting session: {e}")
        return jsonify({"error": str(e)}), 500

# API: Send Interview Message
@app.route('/api/interview/message', methods=['POST'])
def interview_message():
    try:
        data = request.get_json() or {}
        session_id = data.get("sessionId")
        user_message = data.get("userMessage")

        if not session_id or not user_message:
            return jsonify({"error": "Missing sessionId or userMessage"}), 400

        session = store.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404

        # Add user answer to session
        answer_id = f"ans_{int(time.time() * 1000)}"
        user_answer = {
            "id": answer_id,
            "role": "user",
            "content": user_message,
            "timestamp": int(time.time() * 1000)
        }
        store.add_answer(session_id, user_answer)

        # Get updated answer count
        session = store.get_session(session_id)
        user_answers = [a for a in session["answers"] if a.get("role") == "user"]
        answer_count = len(user_answers)

        # Determine chapter based on answer count
        # Chapter 1: answers 0-2 (first 3 answers)
        # Chapter 2: answers 3-5 (next 3 answers)
        # Chapter 3: answers 6-8 (next 3 answers)
        # Chapter 4: answers 9+ (remaining answers)
        if answer_count >= 9:
            chapter = 4
        elif answer_count >= 6:
            chapter = 3
        elif answer_count >= 3:
            chapter = 2
        else:
            chapter = 1

        store.update_chapter(session_id, chapter)

        # Generate chat response
        result = gemini.generate_chat_response(session["answers"], user_message, session_id=session_id)

        if isinstance(result, dict):
            return jsonify(result), 429

        ai_response, is_complete = result
        
        # Add AI answer to session
        ai_answer = {
            "id": f"ai_{int(time.time() * 1000)}",
            "role": "model",
            "content": ai_response,
            "timestamp": int(time.time() * 1000)
        }
        store.add_answer(session_id, ai_answer)

        # Vector processing (Async embedding storage in background)
        # In python, we can run it inline quickly since the mock/API call is fast,
        # or we can spawn a thread if needed. We'll run it synchronously for simplicity & reliability in the demo.
        try:
            embedding = vector.embed_text(user_message)
            vector.store_embedding(session_id, answer_id, user_message, chapter, embedding)
        except Exception as ve:
            logger.error(f"Failed to generate/store vector embedding: {ve}")

        return jsonify({
            "response": ai_response,
            "isComplete": is_complete,
            "chapter": chapter,
            "answerCount": answer_count
        })

    except Exception as e:
        logger.error(f"Error in interview message: {e}")
        return jsonify({"error": str(e)}), 500

# API: Generate Analysis (RAG + Insights)
@app.route('/api/analysis/generate', methods=['POST'])
def generate_analysis():
    try:
        data = request.get_json() or {}
        session_id = data.get("sessionId")

        if not session_id:
            return jsonify({"error": "Missing sessionId"}), 400

        session = store.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404

        # RAG retrieval step: query relevant answers using generic clinical search keywords
        logger.info(f"Retrieving semantic context for session {session_id}")
        retrieved_context = vector.retrieve_relevant_context(
            session_id, 
            query="stress resilience coping social support somatic complaints sleep rest transitions", 
            limit=8
        )

        # Combine answers and RAG context to feed Gemini
        logger.info("Generating insights from Gemini...")
        analysis_data = gemini.generate_analysis(session["answers"], rag_context=retrieved_context)
        # Log the raw analysis return type for debugging unexpected shapes
        try:
            logger.info(f"Analysis returned type: {type(analysis_data)}; repr: {repr(analysis_data)[:400]}")
        except Exception:
            logger.info("Analysis returned (unrepr-able) type: %s", type(analysis_data))

        # If the service returned a pair-like value (e.g. ['text', False])
        # treat it as an incomplete analysis and fall back to the mock generator.
        if isinstance(analysis_data, (list, tuple)) and len(analysis_data) == 2 and isinstance(analysis_data[1], bool):
            logger.warning("Analysis service returned an interview-style tuple/list; falling back to mock analysis data.")
            analysis_data = gemini.get_mock_analysis_data(session["answers"])

        if not isinstance(analysis_data, dict):
            logger.warning("Analysis service returned an unexpected format; falling back to mock analysis data.")
            analysis_data = gemini.get_mock_analysis_data(session["answers"])

        # Save to database
        store.save_analysis(session_id, analysis_data)
        logger.info(f"Analysis saved for session {session_id}")

        return jsonify(analysis_data)
    except Exception as e:
        logger.error(f"Error generating analysis: {e}")
        return jsonify({"error": str(e)}), 500

# API: Get Session Result
@app.route('/api/session/<session_id>/result', methods=['GET'])
def get_session_result(session_id):
    try:
        session = store.get_session(session_id)
        if not session:
            return jsonify({"error": "Session not found"}), 404
        return jsonify(session)
    except Exception as e:
        logger.error(f"Error fetching session result: {e}")
        return jsonify({"error": str(e)}), 500

# Static File Routes
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if not path or path == "":
        return send_from_directory(app.static_folder, 'index.html')
    
    # Check if the requested file exists in the static folder
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    
    # Fallback to index.html for SPA routing
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Run server on port defined in config
    logger.info(f"Starting LifeTrace backend on port {config.PORT}...")
    app.run(host='0.0.0.0', port=config.PORT, debug=(config.FLASK_ENV == 'development'))
