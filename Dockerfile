FROM python:3.11-slim AS base
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source folders
COPY server/ ./server/
COPY public/ ./public/

# Expose port
EXPOSE 8080

# Health check (requires wget, which is installed above)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD wget -qO- http://localhost:8080/health || exit 1

# Start the Flask app
CMD ["python", "server/app.py"]
