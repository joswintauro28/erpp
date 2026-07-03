import os
from cryptography.fernet import Fernet

KEY_STR = os.getenv("ENCRYPTION_KEY")
if not KEY_STR:
    raise RuntimeError("FATAL: ENCRYPTION_KEY environment variable is missing. It must be persistently set to run VexBill securely.")

FERNET_INSTANCE = Fernet(KEY_STR.encode())

def _get_fernet():
    return FERNET_INSTANCE

def encrypt_password(password: str) -> str:
    if not password:
        return None
    f = _get_fernet()
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    if not encrypted_password:
        return None
    f = _get_fernet()
    try:
        return f.decrypt(encrypted_password.encode()).decode()
    except Exception:
        # If decryption fails (e.g. key changed or invalid data), return None or raise
        return None
