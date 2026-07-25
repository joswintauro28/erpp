FROM python:3.12-slim AS builder
WORKDIR /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY services/crm-service/requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --prefer-binary -r requirements.txt

FROM python:3.12-slim AS runner
WORKDIR /app/services/crm-service

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8001

RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup --create-home appuser

COPY --from=builder /opt/venv /opt/venv
COPY --chown=appuser:appgroup services/crm-service/app ./app
COPY --chown=appuser:appgroup services/crm-service/main.py .
COPY --chown=appuser:appgroup services/crm-service/alembic ./alembic
COPY --chown=appuser:appgroup services/crm-service/alembic.ini .

USER appuser
EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request,os; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','8001')+'/health')"

CMD ["sh", "-c", "alembic upgrade head && exec uvicorn main:app --host 0.0.0.0 --port 8001 --proxy-headers --forwarded-allow-ips=* --timeout-graceful-shutdown 10"]
