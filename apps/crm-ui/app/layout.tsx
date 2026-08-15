import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider, ThemeProvider } from "@datavex/ui-theme";
import ToastContainer from "@/components/ToastContainer";

const montserrat = localFont({
  src: "./fonts/montserrat-variable.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
});

const inter = localFont({
  src: "./fonts/inter-variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
});

const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-variable.woff2",
  variable: "--font-jetbrains-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "DATAVEX | CRM Workstation",
  description: "Advanced CRM Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              {children}
              <ToastContainer />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
