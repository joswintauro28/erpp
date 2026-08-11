import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@datavex/ui-theme";

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
  title: "DATAVEX | Billing Center",
  description: "Billing & invoicing workstation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <AuthProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
