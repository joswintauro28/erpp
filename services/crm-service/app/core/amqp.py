import logging
import aio_pika
import os

logger = logging.getLogger("app.core.amqp")

connection = None
channel = None

async def connect_amqp():
    global connection, channel
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    try:
        connection = await aio_pika.connect_robust(rabbitmq_url)
        channel = await connection.channel()
        # Declare the topic exchange
        await channel.declare_exchange("erp_events", aio_pika.ExchangeType.TOPIC, durable=True)
        logger.info(f"Connected to RabbitMQ at {rabbitmq_url} and declared 'erp_events' exchange.")
    except Exception as e:
        logger.error(f"Failed to connect to RabbitMQ: {str(e)}")

async def disconnect_amqp():
    global connection
    if connection:
        await connection.close()
        logger.info("Closed RabbitMQ connection.")

def get_channel():
    global channel
    return channel

async def get_exchange():
    global channel
    if channel:
        try:
            return await channel.get_exchange("erp_events")
        except Exception:
            # Fallback in case of quick fetch failure/channel state
            return None
    return None
