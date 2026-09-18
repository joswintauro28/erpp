import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider, ThemeProvider, BrandingProvider, CssOverrides } from "@datavex/ui-theme";

const plusJakartaSans = localFont({
  src: "./fonts/PlusJakartaSans-VariableFont_wght.ttf",
  variable: "--font-sans",
});

const lora = localFont({
  src: "./fonts/Lora-VariableFont_wght.ttf",
  variable: "--font-serif",
});

const ibmPlexMono = localFont({
  src: "./fonts/IBMPlexMono-Regular.ttf",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "DATAVEX | Inventory Center",
  description: "Inventory & logistics workstation",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} ${lora.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <ThemeProvider>
          <AuthProvider>
            <BrandingProvider>
              <CssOverrides />
              <NotificationProvider>{children}</NotificationProvider>
            </BrandingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
