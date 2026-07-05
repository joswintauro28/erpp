import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession

PERMISSION_CODES: list[str] = [
    "clients.view", "clients.create", "clients.edit", "clients.delete",
    "invoices.view", "invoices.create", "invoices.edit", "invoices.delete",
    "quotations.view", "quotations.create", "quotations.edit", "quotations.delete",
    "products.view", "products.create", "products.edit", "products.delete",
    "stock.view", "stock.manage", "stock.adjust",
    "payments.view", "payments.create", "payments.edit", "payments.delete",
    "expenses.view", "expenses.create", "expenses.edit",
    "reports.view",
    "settings.manage",
    "users.manage",
    "suppliers.view", "suppliers.create", "suppliers.manage",
    "accounting.view", "accounting.create", "accounting.edit", "accounting.delete",
    "workflow.manage",
    "audit_logs.view",
]

SYSTEM_ROLES: dict[str, list[str]] = {
    "Organization Owner": PERMISSION_CODES,
    "Accountant": [
        "clients.view", "clients.create", "clients.edit",
        "invoices.view", "invoices.create", "invoices.edit",
        "payments.view", "payments.create",
        "reports.view",
        "accounting.view", "accounting.create",
    ],
    "Sales Executive": [
        "clients.view", "clients.create", "clients.edit",
        "quotations.view", "quotations.create", "quotations.edit",
        "invoices.view",
        "products.view",
    ],
    "Inventory Manager": [
        "products.view", "products.create", "products.edit",
        "stock.view", "stock.manage", "stock.adjust",
        "suppliers.view", "suppliers.create", "suppliers.manage",
    ],
    "Auditor": [
        "reports.view",
        "audit_logs.view",
        "invoices.view",
        "payments.view",
    ],
    "Employee": [
        "clients.view",
        "invoices.view",
        "products.view",
        "stock.view",
        "reports.view",
    ],
}


async def seed_system_permissions(db: AsyncSession) -> None:
    from app.models.organization import Permission, Role, RolePermission

    existing = await db.execute(sa.select(Permission).limit(1))
    if existing.scalar_one_or_none():
        return

    # Create permissions
    perm_objs: dict[str, Permission] = {}
    for code in PERMISSION_CODES:
        perm = Permission(code=code, name=code, module=code.split(".")[0])
        db.add(perm)
        perm_objs[code] = perm
    await db.flush()

    # Create roles and assign permissions
    for role_name, perm_codes in SYSTEM_ROLES.items():
        role = Role(name=role_name, description=role_name, is_system_role=True)
        db.add(role)
        await db.flush()
        for code in perm_codes:
            if code in perm_objs:
                db.add(RolePermission(role_id=role.id, permission_id=perm_objs[code].id))
    await db.flush()


async def has_permission(
    db: AsyncSession,
    user_id: int,
    permission_code: str,
) -> bool:
    from app.models.organization import (
        OrganizationMember,
        Role,
        RolePermission,
        Permission,
    )

    # Check if user is org owner (has all permissions)
    stmt = (
        sa.select(OrganizationMember)
        .where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        )
    )
    result = await db.execute(stmt)
    memberships = result.scalars().all()

    for membership in memberships:
        role_stmt = (
            sa.select(Role)
            .where(Role.id == membership.role_id)
        )
        role_result = await db.execute(role_stmt)
        role = role_result.scalar_one_or_none()
        if role and role.name == "Organization Owner":
            return True

        if role:
            rp_stmt = (
                sa.select(RolePermission)
                .where(RolePermission.role_id == role.id)
            )
            rp_result = await db.execute(rp_stmt)
            role_perms = rp_result.scalars().all()

            perm_stmt = (
                sa.select(Permission)
                .where(
                    Permission.id.in_([rp.permission_id for rp in role_perms]),
                    Permission.code == permission_code,
                )
            )
            perm_result = await db.execute(perm_stmt)
            if perm_result.scalar_one_or_none():
                return True

    return False
