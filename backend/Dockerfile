FROM python:3.11-slim
ARG MONGO_URL=mongodb://root:4fAS9WeGVLcztQkYV0orcqrS620FL1tWGvIP58CrzthbJUhmRI8do8hMT0C92BTn@lrt90tojzjz2jzugfowo8nat:27017/?directConnection=true
ARG DB_NAME=spis_castle
ARG COOLIFY_URL=http://aa5hp9zudiqhoh2kn1rdf4oa.178.104.72.151.sslip.io
ARG COOLIFY_FQDN=aa5hp9zudiqhoh2kn1rdf4oa.178.104.72.151.sslip.io
ARG COOLIFY_BRANCH=conflict_290326_0926
ARG COOLIFY_RESOURCE_UUID=aa5hp9zudiqhoh2kn1rdf4oa

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create upload directories
RUN mkdir -p uploads/audio uploads/partners

# Expose port
EXPOSE 8002

# Run the application
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "2"]