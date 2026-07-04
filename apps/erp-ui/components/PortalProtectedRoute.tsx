"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const token = localStorage.getItem("portal_token");
      if (!token) {
        router.replace("/portal/login");
      }
    }
  }, [mounted, router]);

  if (!mounted) return null;

  const token = typeof window !== "undefined" ? localStorage.getItem("portal_token") : null;
  if (!token) return null;

  return children;
}
