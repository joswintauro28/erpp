import Sidebar from "./Sidebar";
import Header from "./Header";
import { ReactNode } from "react";
import "./DashboardLayout.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__main">
        <Header />
        <main className="layout__content">{children}</main>
      </div>
    </div>
  );
}
