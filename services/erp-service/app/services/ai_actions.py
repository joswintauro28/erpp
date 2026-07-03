# This file provides a foundation for future AI write-actions (e.g. creating invoices, updating leads).
# Currently, the AI is purely analytical (read-only), but this abstraction layer is ready.

def execute_action(action_name: str, params: dict, owner_id: int):
    """
    Executes a specific state-mutating action on behalf of the AI.
    """
    if action_name == "create_invoice":
        pass
    elif action_name == "mark_invoice_paid":
        pass
    else:
        raise ValueError(f"Unknown action: {action_name}")
