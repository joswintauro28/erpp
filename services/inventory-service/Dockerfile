FROM python:3.13-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY services/inventory-service/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim AS runner
WORKDIR /app/services/inventory-service
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Create a non-root user for runtime security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup --create-home appuser

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appgroup services/inventory-service/app ./app
COPY --chown=appuser:appgroup services/inventory-service/alembic ./alembic
COPY --chown=appuser:appgroup services/inventory-service/alembic.ini .

# Ensure appuser owns the working directory
RUN chown -R appuser:appgroup /app/services/inventory-service

USER appuser
EXPOSE 8004

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8004/')" || exit 1

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8004"]

