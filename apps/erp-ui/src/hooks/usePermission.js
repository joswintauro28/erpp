import { useAuth } from "../context/AuthContext";

export default function usePermission(permission) {
    const { user } = useAuth();

    if (!user) return false;

    const permissions = user.permissions || [];

    return permissions.includes(permission);
}
