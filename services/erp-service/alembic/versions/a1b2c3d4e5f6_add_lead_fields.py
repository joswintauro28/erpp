"""add_lead_fields

Revision ID: a1b2c3d4e5f6
Revises: 035b2fd84a74
Create Date: 2026-07-05 15:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '035b2fd84a74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('leads', sa.Column('company_name', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('contact_person', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('lead_score', sa.Integer(), nullable=False, server_default=sa.text('0')))
    op.add_column('leads', sa.Column('assigned_to', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('source', sa.String(length=100), nullable=False, server_default=sa.text("'Website'")))
    op.add_column('leads', sa.Column('gst_number', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('leads', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('leads', sa.Column('website', sa.String(length=255), nullable=True))
    op.add_column('leads', sa.Column('industry', sa.String(length=100), nullable=True))

    op.execute("UPDATE leads SET company_name = name WHERE company_name IS NULL")

    op.alter_column('leads', 'company_name', nullable=False)
    op.drop_column('leads', 'name')

    op.create_index(op.f('ix_leads_owner_id'), 'leads', ['owner_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_leads_owner_id'), table_name='leads')

    op.add_column('leads', sa.Column('name', sa.String(length=255), nullable=True))
    op.execute("UPDATE leads SET name = company_name WHERE name IS NULL")
    op.alter_column('leads', 'name', nullable=False)

    op.drop_column('leads', 'company_name')
    op.drop_column('leads', 'contact_person')
    op.drop_column('leads', 'lead_score')
    op.drop_column('leads', 'assigned_to')
    op.drop_column('leads', 'source')
    op.drop_column('leads', 'gst_number')
    op.drop_column('leads', 'state')
    op.drop_column('leads', 'address')
    op.drop_column('leads', 'website')
    op.drop_column('leads', 'industry')
