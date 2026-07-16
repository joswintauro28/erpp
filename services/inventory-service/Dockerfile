FROM python:3.13-slim AS builder
WORKDIR /app
COPY services/inventory-service/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.13-slim AS runner
WORKDIR /app/services/inventory-service
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH=/root/.local/bin:$PATH

COPY --from=builder /root/.local /root/.local
COPY services/inventory-service/app ./app
COPY services/inventory-service/alembic ./alembic
COPY services/inventory-service/alembic.ini .

EXPOSE 8004
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8004/')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8004"]
