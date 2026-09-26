"""Seed ai-service database with sessions, message history, and audit logs."""
import asyncio
import os
import sys
import uuid
import argparse
from datetime import datetime, timezone, timedelta

service_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
repo_root = os.path.abspath(os.path.join(service_dir, "..", ".."))
sys.path.append(service_dir)
sys.path.append(repo_root)

from dotenv import load_dotenv
load_dotenv(os.path.join(service_dir, ".env"))

from app.core.database import async_session_factory, Base, engine
from app.models import AISession, AIMessage, AIAuditLog
from sqlalchemy import text


async def seed_dev(db):
    print("Seeding ai-service [Profile: dev]...")

    now = datetime.now(timezone.utc)

    # ── Org 1: 4 sessions across modules ──────────────────────────────
    dev_sessions = [
        {
            "org_id": 1, "user_id": 1, "module": "admin", "title": "System Architecture Overview",
            "messages": [
                ("user", "Explain how multi-tenant isolation works in DATAVEX ERP.", 22),
                ("assistant", "DATAVEX ERP enforces multi-tenancy at the database and query layer using organization_id extracted securely from signed JWT claims. Cross-tenant leakage is prevented across all microservices.", 68),
            ],
        },
        {
            "org_id": 1, "user_id": 2, "module": "crm", "title": "Lead Conversion Optimization",
            "messages": [
                ("user", "What is the recommended action for high-value leads in the negotiation stage?", 18),
                ("assistant", "Focus on the Meridian Foods opportunity (OP-202608-0001). Suggest scheduling an executive sponsor review and offering Net 30 billing terms to accelerate closure.", 54),
            ],
        },
        {
            "org_id": 1, "user_id": 3, "module": "billing", "title": "Overdue Invoices Analysis",
            "messages": [
                ("user", "Identify our current top overdue invoices and aging profile.", 14),
                ("assistant", "Invoice INV-202608-0003 for Halcyon Media is 60 days overdue (₹42,000 balance). Invoice INV-202608-0019 for Orbit Health is 45 days overdue (₹1,59,360 balance). Level 2 and 3 dunning notices have been issued.", 72),
            ],
        },
        {
            "org_id": 1, "user_id": 4, "module": "inventory", "title": "Critical Stock Reorder Levels",
            "messages": [
                ("user", "Which products are currently below their minimum safety threshold?", 15),
                ("assistant", "Micro PLC Controller (PLC-CP1E) is at 8 units against a threshold of 15. IoT Gateway Edge Controller (IOT-GW200) is at 3 units against a threshold of 5. Recommend issuing purchase requisitions immediately.", 65),
            ],
        },
    ]

    for s_idx, s_data in enumerate(dev_sessions):
        session_id = str(uuid.uuid4())
        session = AISession(
            id=session_id,
            user_id=s_data["user_id"],
            organization_id=s_data["org_id"],
            module=s_data["module"],
            title=s_data["title"],
            created_at=now - timedelta(days=s_idx + 1),
            updated_at=now - timedelta(days=s_idx),
        )
        db.add(session)
        await db.flush()

        for m_role, m_content, m_tokens in s_data["messages"]:
            db.add(AIMessage(
                id=str(uuid.uuid4()),
                session_id=session_id,
                role=m_role,
                content=m_content,
                token_count=m_tokens,
                created_at=now - timedelta(hours=s_idx * 5),
            ))

        db.add(AIAuditLog(
            user_id=s_data["user_id"],
            organization_id=s_data["org_id"],
            session_id=session_id,
            module=s_data["module"],
            action="chat",
            input_tokens=s_data["messages"][0][2],
            output_tokens=s_data["messages"][1][2],
            response_time_ms=820 + s_idx * 150,
            success=True,
            user_message_preview=s_data["messages"][0][1][:100],
            created_at=now - timedelta(hours=s_idx * 5),
        ))
    await db.flush()

    # ── Org 2: 1 session ──────────────────────────────────────────────
    org2_session_id = str(uuid.uuid4())
    db.add(AISession(
        id=org2_session_id,
        user_id=1,
        organization_id=2,
        module="billing",
        title="Eternal Billing Forecast",
        created_at=now - timedelta(days=1),
        updated_at=now,
    ))
    await db.flush()
    db.add(AIMessage(id=str(uuid.uuid4()), session_id=org2_session_id, role="user", content="Forecast Q4 cash receipts for Eternal Aviation accounts.", token_count=16))
    db.add(AIMessage(id=str(uuid.uuid4()), session_id=org2_session_id, role="assistant", content="Projected cash receipts for Cirrus Aviation contract stand at ₹118,000 due this month.", token_count=32))
    db.add(AIAuditLog(
        user_id=1, organization_id=2, session_id=org2_session_id, module="billing", action="chat",
        input_tokens=16, output_tokens=32, response_time_ms=640, success=True, user_message_preview="Forecast Q4 cash receipts...",
    ))
    await db.flush()

    # ── Org 3: 1 session ──────────────────────────────────────────────
    org3_session_id = str(uuid.uuid4())
    db.add(AISession(
        id=org3_session_id,
        user_id=2,
        organization_id=3,
        module="crm",
        title="Zomato Fleet Opportunity Analysis",
        created_at=now - timedelta(days=2),
    ))
    await db.flush()
    db.add(AIMessage(id=str(uuid.uuid4()), session_id=org3_session_id, role="user", content="Summarize status of logistics fleet lead.", token_count=12))
    db.add(AIMessage(id=str(uuid.uuid4()), session_id=org3_session_id, role="assistant", content="Lead is currently in New stage with an estimated contract value of ₹45,000.", token_count=28))

    # ── Org 5: 0 sessions (empty state) ───────────────────────────────
    print("  Org 5 left with 0 AI records (empty-state verification).")

    await db.commit()
    print("Dev profile ai-service seeding completed!")


async def seed_testing(db):
    print("Seeding ai-service [Profile: testing]...")

    now = datetime.now(timezone.utc)
    modules = ["admin", "crm", "billing", "inventory"]

    async def bulk_seed_ai(org_id: int, session_count: int, prefix: str):
        print(f"  Generating bulk AI data for Org {org_id} ({session_count} sessions)...")
        for s_idx in range(1, session_count + 1):
            mod = modules[s_idx % len(modules)]
            user_id = (s_idx % 5) + 1
            session_id = str(uuid.uuid4())
            db.add(AISession(
                id=session_id,
                user_id=user_id,
                organization_id=org_id,
                module=mod,
                title=f"{prefix} Automated Analysis Session #{s_idx} ({mod})",
                created_at=now - timedelta(hours=s_idx * 3),
                updated_at=now - timedelta(hours=s_idx * 2),
            ))
            await db.flush()

            # 4 messages per session
            m1_id = str(uuid.uuid4())
            m2_id = str(uuid.uuid4())
            db.add(AIMessage(
                id=m1_id,
                session_id=session_id,
                role="user",
                content=f"What are the key KPIs and alerts for module {mod}?",
                token_count=15,
                created_at=now - timedelta(hours=s_idx * 3),
            ))
            db.add(AIMessage(
                id=m2_id,
                session_id=session_id,
                role="assistant",
                content=f"Module {mod} reports operational health within 98.5% efficiency. No blocking anomalies detected.",
                token_count=35,
                created_at=now - timedelta(hours=s_idx * 3 - 1),
            ))

            # Audit log
            is_success = s_idx % 12 != 0
            db.add(AIAuditLog(
                user_id=user_id,
                organization_id=org_id,
                session_id=session_id,
                module=mod,
                action="chat" if s_idx % 2 == 0 else "stream",
                input_tokens=15,
                output_tokens=35 if is_success else 0,
                response_time_ms=450 + (s_idx * 25) % 1500,
                success=is_success,
                error_message=None if is_success else "Upstream rate limit test trigger",
                user_message_preview=f"What are the key KPIs and alerts for module {mod}?",
                created_at=now - timedelta(hours=s_idx * 3),
            ))
        await db.flush()

    # Org 1: 40 sessions
    await bulk_seed_ai(1, 40, "O1")

    # Org 2: 10 sessions
    await bulk_seed_ai(2, 10, "O2")

    # Org 3: 5 sessions
    await bulk_seed_ai(3, 5, "O3")

    # Org 4: 2 sessions
    await bulk_seed_ai(4, 2, "O4")

    # Org 5: 0 sessions (empty state)
    print("  Org 5 left with 0 AI records (empty-state verification).")

    await db.commit()
    print("Testing profile ai-service seeding completed!")


async def seed(profile="dev"):
    print(f"Starting ai-service seed [Profile: {profile}]...")
    async with async_session_factory() as db:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            await db.execute(text("TRUNCATE TABLE ai_audit_log, ai_messages, ai_sessions CASCADE"))
            await db.commit()

            if profile == "testing":
                await seed_testing(db)
            else:
                await seed_dev(db)

            print("ai-service seeding completed successfully!")
        except Exception as e:
            await db.rollback()
            print(f"Error seeding ai-service: {e}")
            raise

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed ai-service database")
    parser.add_argument("--profile", default=os.getenv("SEED_PROFILE", "dev"), choices=["dev", "testing"], help="Seed profile (dev or testing)")
    parser.add_argument("--testing", action="store_true", help="Shortcut for --profile testing")
    args = parser.parse_args()

    active_profile = "testing" if args.testing else args.profile
    asyncio.run(seed(active_profile))
