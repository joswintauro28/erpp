from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.organization import OrganizationMember, Permission, Role, RolePermission


PERMISSION_CODES = [
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


SYSTEM_ROLES = {
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
        "purchase_orders.view", "purchase_orders.create", "purchase_orders.manage",
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


def ensure_permissions(db: Session) -> dict[str, Permission]:
    existing = {p.code: p for p in db.execute(select(Permission)).scalars().all()}
    for code in PERMISSION_CODES:
        if code not in existing:
            perm = Permission(code=code, name=code.replace("_", " ").title(), module=code.split(".")[0])
            db.add(perm)
            existing[code] = perm
    db.flush()
    return existing


def ensure_roles(db: Session, permissions_map: dict[str, Permission]) -> dict[str, Role]:
    existing = {r.name: r for r in db.execute(select(Role)).scalars().all()}
    for role_name, perm_codes in SYSTEM_ROLES.items():
        if role_name not in existing:
            role = Role(name=role_name, description=f"{role_name}", is_system_role=True)
            db.add(role)
            db.flush()
            existing[role_name] = role
    db.flush()
    return existing


def ensure_role_permissions(db: Session, roles: dict[str, Role], permissions_map: dict[str, Permission]):
    for role_name, perm_codes in SYSTEM_ROLES.items():
        role = roles[role_name]
        for code in perm_codes:
            perm = permissions_map.get(code)
            if perm:
                existing = db.execute(
                    select(RolePermission).where(
                        RolePermission.role_id == role.id,
                        RolePermission.permission_id == perm.id,
                    )
                ).scalar_one_or_none()
                if not existing:
                    db.add(RolePermission(role_id=role.id, permission_id=perm.id))
    db.flush()


def has_permission(db: Session, user_id: int, permission_code: str) -> bool:
    membership = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        ).order_by(OrganizationMember.id).limit(1)
    ).scalar_one_or_none()

    if not membership:
        return False

    role = db.execute(select(Role).where(Role.id == membership.role_id)).scalar_one_or_none()
    if not role:
        return False

    if role.name == "Organization Owner":
        return True

    perm = db.execute(
        select(Permission).where(Permission.code == permission_code)
    ).scalar_one_or_none()
    if not perm:
        return False

    rp = db.execute(
        select(RolePermission).where(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == perm.id,
        )
    ).scalar_one_or_none()

    return rp is not None


def user_organization_id(db: Session, user_id: int) -> int | None:
    membership = db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user_id,
            OrganizationMember.status == "active",
        ).order_by(OrganizationMember.id).limit(1)
    ).scalar_one_or_none()
    return membership.organization_id if membership else None
