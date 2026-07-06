import hashlib
import logging
import numpy as np
from google import genai
import server.config as config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# In-memory vector store fallback
# Schema: list of dicts: {"session_id": str, "answer_id": str, "text": str, "chapter": int, "embedding": list}
_local_vector_db = []

# Initialize GenAI Client for Vertex AI Embeddings
genai_client = None
if config.GEMINI_API_KEY:
    try:
        # If API key is set, we can use the genai client
        genai_client = genai.Client(api_key=config.GEMINI_API_KEY)
        logger.info("GenAI client for embeddings initialized.")
    except Exception as e:
        logger.warning(f"Failed to initialize GenAI client: {e}. Using mock embeddings.")

# Initialize AlloyDB Connector if config is present
alloydb_pool = None
if config.has_alloydb():
    try:
        from google.cloud.alloydb.connector import Connector
        import sqlalchemy
        
        connector = Connector()
        
        def getconn():
            conn = connector.connect(
                config.ALLOYDB_INSTANCE_CONNECTION_NAME,
                "pg8000",
                user=config.ALLOYDB_USER,
                password=config.ALLOYDB_PASS,
                db=config.ALLOYDB_DB
            )
            return conn

        # Create connection pool
        alloydb_pool = sqlalchemy.create_engine(
            "postgresql+pg8000://",
            creator=getconn,
        )
        logger.info("AlloyDB engine pool initialized.")
    except Exception as e:
        logger.warning(f"Failed to initialize AlloyDB engine pool: {e}. Using local in-memory vector store.")
else:
    logger.info("AlloyDB config not set. Using local in-memory vector store.")


def embed_text(text: str) -> list:
    """Generate a 768-dimension embedding vector for the text."""
    if genai_client is not None:
        # Try models in order: text-embedding-004 works with GEMINI_API_KEY
        for embed_model in ["gemini-embedding-2"]:
            try:
                response = genai_client.models.embed_content(
                    model=embed_model,
                    contents=text
                )
                if response.embeddings:
                    logger.info(f"Embedding generated via {embed_model}.")
                    return response.embeddings[0].values
            except Exception as e:
                logger.warning(f"Embedding model {embed_model} failed: {e}.")

    # Deterministic mock embedding generator: 768 dimensions
    # We seed numpy's random generator with the SHA-256 hash of the text
    hasher = hashlib.sha256(text.encode('utf-8'))
    seed = int(hasher.hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    mock_vector = rng.standard_normal(768)
    # Normalize the vector to unit length
    norm = np.linalg.norm(mock_vector)
    if norm > 0:
        mock_vector = mock_vector / norm
    return mock_vector.tolist()


def store_embedding(session_id: str, answer_id: str, text: str, chapter: int, embedding: list) -> None:
    """Store the embedding vector along with metadata in AlloyDB or local memory."""
    # Always save to local vector DB as a fail-safe / cache
    record = {
        "session_id": session_id,
        "answer_id": answer_id,
        "text": text,
        "chapter": chapter,
        "embedding": embedding
    }
    _local_vector_db.append(record)

    if alloydb_pool is not None:
        try:
            with alloydb_pool.connect() as conn:
                # We use SQLAlchemy to insert. Make sure the table `answer_embeddings` exists
                # In pgvector we store embedding as a string representation e.g. '[0.1, 0.2, ...]'
                embedding_str = f"[{','.join(map(str, embedding))}]"
                
                query = sqlalchemy.text(
                    """
                    INSERT INTO answer_embeddings (session_id, answer_id, answer_text, chapter, embedding)
                    VALUES (:session_id, :answer_id, :answer_text, :chapter, :embedding::vector)
                    """
                )
                conn.execute(
                    query,
                    {
                        "session_id": session_id,
                        "answer_id": answer_id,
                        "answer_text": text,
                        "chapter": chapter,
                        "embedding": embedding_str
                    }
                )
                # Commit the transaction
                conn.commit()
            return
        except Exception as e:
            logger.error(f"AlloyDB insert error: {e}. Stored locally instead.")


def retrieve_relevant_context(session_id: str, query: str, limit: int = 8) -> list:
    """Retrieve semantically related answers for the session."""
    query_vector = embed_text(query)

    # If AlloyDB is available, run the pgvector cosine distance query
    if alloydb_pool is not None:
        try:
            import sqlalchemy
            with alloydb_pool.connect() as conn:
                # embedding <=> :query_vector computes cosine distance (1 - cosine_similarity)
                # So we order by <=> ascending (closest first)
                query_vector_str = f"[{','.join(map(str, query_vector))}]"
                query = sqlalchemy.text(
                    """
                    SELECT answer_text, chapter, (1 - (embedding <=> :query_vector::vector)) AS similarity
                    FROM answer_embeddings
                    WHERE session_id = :session_id
                    ORDER BY embedding <=> :query_vector::vector
                    LIMIT :limit
                    """
                )
                result = conn.execute(
                    query,
                    {
                        "session_id": session_id,
                        "query_vector": query_vector_str,
                        "limit": limit
                    }
                )
                
                rows = []
                for row in result:
                    rows.append({
                        "answer_text": row[0],
                        "chapter": row[1],
                        "similarity": float(row[2])
                    })
                return rows
        except Exception as e:
            logger.error(f"AlloyDB retrieve query failed: {e}. Querying local memory instead.")

    # Local fallback using numpy cosine similarity
    session_records = [r for r in _local_vector_db if r["session_id"] == session_id]
    if not session_records:
        return []

    # Compute similarity for each record
    q_vec = np.array(query_vector)
    scored_records = []
    for r in session_records:
        r_vec = np.array(r["embedding"])
        dot_val = np.dot(q_vec, r_vec)
        q_norm = np.linalg.norm(q_vec)
        r_norm = np.linalg.norm(r_vec)
        similarity = float(dot_val / (q_norm * r_norm)) if (q_norm > 0 and r_norm > 0) else 0.0
        
        scored_records.append({
            "answer_text": r["text"],
            "chapter": r["chapter"],
            "similarity": similarity
        })

    # Sort descending by similarity
    scored_records.sort(key=lambda x: x["similarity"], reverse=True)
    return scored_records[:limit]
