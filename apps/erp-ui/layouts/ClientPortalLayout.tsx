import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, Home, FileText, FileSignature, CreditCard, User, Menu } from "lucide-react";
import "./Sidebar.css";
import "./DashboardLayout.css";
import { useState, ReactNode } from "react";

export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("client_id");
    router.push("/portal/login");
  };

  return (
    <div className="layout">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="logo-section">
          <div className="logo-icon">C</div>
          <h2>Client Portal</h2>
        </div>
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}>
          <Menu size={24} />
        </button>
      </div>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar__brand">
          <div style={{ 
            width: 32, height: 32, backgroundColor: 'var(--primary)', color: 'white', 
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
            marginRight: '12px'
          }}>
            C
          </div>
          <h1>Client Portal</h1>
        </div>

        <nav className="sidebar__nav">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link href="/portal/dashboard" className={`sidebar__item ${pathname === "/portal/dashboard" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <Home size={18} /> <span>Dashboard</span>
            </Link>
            <Link href="/portal/quotations" className={`sidebar__item ${pathname === "/portal/quotations" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <FileSignature size={18} /> <span>Quotations</span>
            </Link>
            <Link href="/portal/invoices" className={`sidebar__item ${pathname === "/portal/invoices" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <FileText size={18} /> <span>Invoices</span>
            </Link>
            <Link href="/portal/payments" className={`sidebar__item ${pathname === "/portal/payments" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <CreditCard size={18} /> <span>Payments</span>
            </Link>
          </div>
          
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Link href="/portal/profile" className={`sidebar__item ${pathname === "/portal/profile" ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
              <User size={18} /> <span>Profile</span>
            </Link>
            <button className="sidebar__item text-destructive" onClick={handleLogout} style={{ width: '100%', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <LogOut size={18} /> <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>

      <div className="layout__main">
        <main className="layout__content">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}
