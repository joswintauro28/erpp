FROM python:3.13-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY services/crm-service/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip && \
    pip install -r requirements.txt

FROM python:3.13-slim AS runner
WORKDIR /app/services/crm-service
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Create a non-root user for runtime security
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup --create-home appuser

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appgroup services/crm-service/app ./app
COPY --chown=appuser:appgroup services/crm-service/main.py .

# Ensure appuser owns the working directory
RUN chown -R appuser:appgroup /app/services/crm-service

USER appuser
EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
