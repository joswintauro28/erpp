from app.routers.expenses import get_expenses
from app.database import conn

try:
    conn.rollback() # Just in case
    expenses = get_expenses(current_user=1)
    print("Expenses Fetch OK:", len(expenses["data"]))
except Exception as e:
    import traceback
    traceback.print_exc()
