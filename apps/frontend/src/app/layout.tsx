import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AppLayout from "@/components/AppLayout";
import "./global.css";

export const metadata: Metadata = {
  title: "Datavex.ai Internal ERP Operations Dashboard",
  description: "Enterprise dynamic intelligence tracking node",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <AuthProvider>
          <ThemeProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}