import { Navigate, Outlet } from "react-router-dom";

export default function PortalProtectedRoute() {
  const token = localStorage.getItem("portal_token");
  // Simple check for now. For a robust app, we'd have a PortalAuthContext
  
  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Outlet />;
}
