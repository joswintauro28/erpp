import asyncio
import json
import os
import aio_pika

async def publish_all_mock_events():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
    print(f"Connecting to RabbitMQ at {rabbitmq_url}...")
    
    connection = await aio_pika.connect_robust(rabbitmq_url)
    channel = await connection.channel()
    
    # Get standard exchange
    exchange = await channel.get_exchange("erp_events")
    
    # 1. CRM -> Inventory: crm.order.approved
    crm_approved_data = {
        "event": "crm.order.approved",
        "organization_id": 1,
        "sales_order_code": "SO-2026-999",
        "customer_name": "Meridian Foods",
        "value": "250000",
        "status": "Confirmed",
        "items": [
            {
                "product_name": "Steel Rod 12mm — TATA Tiscon",
                "sku": "SR-12MM",
                "ordered_quantity": 5,
                "unit_price": 50000.0
            }
        ]
    }
    print("Publishing crm.order.approved...")
    await exchange.publish(
        aio_pika.Message(body=json.dumps(crm_approved_data).encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key="crm.order.approved"
    )
    
    # 2. Inventory -> Billing & ERP: inventory.shipment.dispatched
    shipment_data = {
        "event": "inventory.shipment.dispatched",
        "organization_id": 1,
        "sales_order_code": "SO-2026-999",
        "customer_name": "Meridian Foods",
        "warehouse_id": 1,
        "shipping_carrier": "FedEx",
        "tracking_number": "TRK-12345678",
        "items": [
            {
                "product_id": 1,
                "product_name": "Steel Rod 12mm — TATA Tiscon",
                "sku": "SR-12MM",
                "quantity": 5,
                "unit_price": 50000.0,
                "cost_price": 35000.0
            }
        ]
    }
    print("Publishing inventory.shipment.dispatched...")
    await exchange.publish(
        aio_pika.Message(body=json.dumps(shipment_data).encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key="inventory.shipment.dispatched"
    )
    
    # 3. Inventory -> Billing: inventory.po.created
    po_data = {
        "event": "inventory.po.created",
        "organization_id": 1,
        "po_id": 42,
        "order_number": "PO-2026-888",
        "supplier_id": 1,
        "supplier_name": "Primary Industrial Supplier",
        "subtotal": 175000.0,
        "total": 175000.0,
        "items": [
            {
                "product_id": 1,
                "product_name": "Steel Rod 12mm — TATA Tiscon",
                "quantity": 5,
                "unit_price": 35000.0
            }
        ]
    }
    print("Publishing inventory.po.created...")
    await exchange.publish(
        aio_pika.Message(body=json.dumps(po_data).encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key="inventory.po.created"
    )
    
    # 4. Billing -> CRM: billing.invoice.paid
    invoice_paid_data = {
        "event": "billing.invoice.paid",
        "organization_id": 1,
        "payload": {
            "invoiceId": 123,
            "invoiceNumber": "INV-DISP-1234",
            "clientName": "Meridian Foods",
            "amount": 250000.0,
            "timestamp": "2026-08-03T15:00:00"
        }
    }
    print("Publishing billing.invoice.paid...")
    await exchange.publish(
        aio_pika.Message(body=json.dumps(invoice_paid_data).encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key="billing.invoice.paid"
    )
    
    # 5. Billing -> ERP (Notification): billing.invoice.sent
    invoice_sent_data = {
        "event": "billing.invoice.sent",
        "organization_id": 1,
        "payload": {
            "invoiceNumber": "INV-2026-101",
            "clientName": "Orbit Health",
            "total": 120000.0,
            "timestamp": "2026-08-03T15:00:00"
        }
    }
    print("Publishing billing.invoice.sent...")
    await exchange.publish(
        aio_pika.Message(body=json.dumps(invoice_sent_data).encode(), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
        routing_key="billing.invoice.sent"
    )

    print("All mock events published successfully!")
    await connection.close()

if __name__ == "__main__":
    asyncio.run(publish_all_mock_events())
