"""
Google ADK Interview Agent Service
====================================
Uses the Google Agent Development Kit (google-adk) to run the LifeTrace
interview agent. ADK natively manages conversation history, session state,
and tool calling — no manual chat history construction needed.

This service runs alongside the raw Gemini client as a preferred provider.
"""
import os
import asyncio
import logging
from typing import Optional

import server.config as config
from server.prompts.interview import INTERVIEW_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# ── ADK Bootstrap ────────────────────────────────────────────────────────────
_adk_runner = None
_adk_sessions = None
APP_NAME = "lifetrace"

def _init_adk():
    """Initialize the ADK Agent + Runner (called once at import time)."""
    global _adk_runner, _adk_sessions

    if not config.GEMINI_API_KEY:
        logger.warning("ADK: GEMINI_API_KEY not set — ADK agent disabled.")
        return

    try:
        # Set the API key for ADK (it reads from env)
        os.environ.setdefault("GOOGLE_API_KEY", config.GEMINI_API_KEY)
        os.environ.setdefault("GEMINI_API_KEY", config.GEMINI_API_KEY)

        from google.adk import Agent, Runner
        from google.adk.sessions import InMemorySessionService

        # Build the LifeTrace interview agent
        interview_agent = Agent(
            name="lifetrace_interviewer",
            model="gemini-2.5-flash",
            instruction=INTERVIEW_SYSTEM_PROMPT,
        )

        _adk_sessions = InMemorySessionService()
        _adk_runner = Runner(
            agent=interview_agent,
            app_name=APP_NAME,
            session_service=_adk_sessions,
        )
        logger.info("ADK: LifeTrace interview agent initialized successfully.")
    except Exception as e:
        logger.error(f"ADK: Failed to initialize agent — {e}. ADK disabled.")
        _adk_runner = None
        _adk_sessions = None


def _get_or_create_adk_session(session_id: str) -> Optional[str]:
    """Return the ADK session object for this session_id, creating it if needed."""
    if not _adk_sessions:
        return None
    try:
        # ADK InMemorySessionService stores by (app_name, user_id, session_id)
        # We use session_id as both user_id and session_id for simplicity
        try:
            session = _adk_sessions.get_session(
                app_name=APP_NAME, user_id=session_id, session_id=session_id
            )
            if session:
                return session_id
        except Exception:
            pass

        # Create if not found
        _adk_sessions.create_session(
            app_name=APP_NAME, user_id=session_id, session_id=session_id
        )
        return session_id
    except TypeError:
        # Older ADK versions may have different signatures — try positional
        try:
            _adk_sessions.create_session(APP_NAME, session_id, session_id)
            return session_id
        except Exception as e:
            logger.error(f"ADK: Could not create session — {e}")
            return None
    except Exception as e:
        logger.error(f"ADK: Session management error — {e}")
        return None


def run_adk_interview_turn(session_id: str, user_message: str) -> Optional[tuple[str, bool]]:
    """
    Run one turn of the interview using the ADK agent.

    Returns (response_text, is_complete) or None if ADK is unavailable.
    ADK manages conversation history automatically inside the session.
    """
    if not _adk_runner or not _adk_sessions:
        return None

    adk_session_id = _get_or_create_adk_session(session_id)
    if not adk_session_id:
        return None

    try:
        from google.genai import types as genai_types

        # Build the user content object ADK expects
        user_content = genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=user_message)]
        )

        # Run the agent synchronously by executing the async generator
        response_text = ""

        async def _run():
            nonlocal response_text
            async for event in _adk_runner.run_async(
                user_id=session_id,
                session_id=adk_session_id,
                new_message=user_content
            ):
                # Collect the final model text from the response events
                if hasattr(event, "content") and event.content:
                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            response_text += part.text

        asyncio.run(_run())

        if not response_text:
            logger.warning("ADK: Empty response — falling through to Gemini fallback.")
            return None

        is_complete = "[INTERVIEW_COMPLETE]" in response_text
        clean_text = response_text.replace("[INTERVIEW_COMPLETE]", "").strip()

        logger.info(f"ADK: Turn complete. is_complete={is_complete}")
        return clean_text, is_complete

    except Exception as e:
        logger.error(f"ADK: run_async failed — {e}. Falling through.")
        return None


# Initialize on import
_init_adk()
