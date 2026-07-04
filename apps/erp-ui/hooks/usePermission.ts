import { useAuth } from "../contexts/AuthContext";

export default function usePermission(permission: string) {
    const { user } = useAuth();

    if (!user) return false;

    const permissions = user.permissions || [];

    return permissions.includes(permission);
}
