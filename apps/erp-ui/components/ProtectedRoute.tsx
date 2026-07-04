"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import Spinner from "./ui/Spinner";
import { useEffect } from "react";

interface ProtectedRouteProps {
  requiredPermission?: string;
  children: React.ReactNode;
}

export default function ProtectedRoute({ requiredPermission, children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Spinner size="lg" message="Loading..." />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (
    requiredPermission &&
    !(user.permissions || []).includes(requiredPermission)
  ) {
    router.replace("/403");
    return null;
  }

  return children;
}
