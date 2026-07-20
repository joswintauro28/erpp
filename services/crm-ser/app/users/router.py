from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app import database, models
from app.users import schemas, crud
from app.core.router_utils import generic_summary

router = APIRouter(tags=["users"])

@router.get("/api/users", response_model=schemas.UserManagementData)
def get_users_data(db: Session = Depends(database.get_db)):
    data = crud.get_users(db)
    summary = generic_summary(data, active_vals=['Active'], attention_vals=['Suspended'])
    return {"summary": summary, "users": data}

@router.post("/api/admin/login")
def admin_login(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    admin = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not admin or admin.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if admin.role not in ["Admin", "Super Admin"]:
        raise HTTPException(status_code=403, detail="Access denied. Administrator role required.")
    
    admin.last_login = datetime.now().strftime("%b %d %I:%M %p")
    db.commit()
    db.refresh(admin)
    return {"status": "success", "user": {"id": admin.id_str, "name": admin.name, "email": admin.email, "role": admin.role}}

@router.post("/api/employee/login")
def employee_login(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    employee = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not employee or employee.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if employee.role != "Employee":
        raise HTTPException(status_code=403, detail="Access denied. Employee role required.")
    if employee.status != "Active":
        raise HTTPException(status_code=403, detail="Account is suspended or inactive")
        
    employee.last_login = datetime.now().strftime("%b %d %I:%M %p")
    db.commit()
    db.refresh(employee)
    return {"status": "success", "user": {"id": employee.id_str, "name": employee.name, "email": employee.email, "role": employee.role}}
