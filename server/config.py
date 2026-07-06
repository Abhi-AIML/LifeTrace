import os
from dotenv import load_dotenv

# Load .env file if it exists (for local dev)
# We search up one level because server/ is a subdirectory
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# App configuration
PORT = int(os.environ.get("PORT", 8080))
FLASK_ENV = os.environ.get("FLASK_ENV", "production")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Google Cloud credentials / Project configuration
GOOGLE_CLOUD_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
FIRESTORE_DATABASE_ID = os.environ.get("FIRESTORE_DATABASE_ID", "(default)")

# AlloyDB credentials
ALLOYDB_INSTANCE_CONNECTION_NAME = os.environ.get("ALLOYDB_INSTANCE_CONNECTION_NAME", "")
ALLOYDB_DB = os.environ.get("ALLOYDB_DB", "lifetrace")
ALLOYDB_USER = os.environ.get("ALLOYDB_USER", "postgres")
ALLOYDB_PASS = os.environ.get("ALLOYDB_PASS", "")

# Feature status flags
def has_firestore():
    # If project is set, try to use Firestore, otherwise fallback
    return bool(GOOGLE_CLOUD_PROJECT)

def has_alloydb():
    return bool(
        ALLOYDB_INSTANCE_CONNECTION_NAME and
        ALLOYDB_DB and
        ALLOYDB_USER and
        ALLOYDB_PASS
    )
