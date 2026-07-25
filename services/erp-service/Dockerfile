FROM python:3.12-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY services/erp-service/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app/services/erp-service
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Create a non-root user for runtime security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup --create-home appuser

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appgroup services/erp-service/app ./app
COPY --chown=appuser:appgroup services/erp-service/alembic ./alembic
COPY --chown=appuser:appgroup services/erp-service/alembic.ini .

# Ensure appuser owns the working directory
RUN chown -R appuser:appgroup /app/services/erp-service

USER appuser
EXPOSE 8000

CMD alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000


