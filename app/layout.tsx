import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth";
import { ApiKeysProvider } from "@/lib/api-keys";
import { BackgroundSettingsProvider } from "@/lib/hooks/useBackgroundSettings";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Composer",
  description: "Visual editor for designing AI agent workflows",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Composer",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <body className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}>
        <AuthProvider>
          <ApiKeysProvider>
            <BackgroundSettingsProvider>{children}</BackgroundSettingsProvider>
          </ApiKeysProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
