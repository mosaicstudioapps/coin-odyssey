import type { Metadata } from "next";
import "./globals.css";

// Fonts and both color themes arrive in Phase 2 (design system).
export const metadata: Metadata = {
  title: "Coin Odyssey",
  description: "Photograph a coin, learn its story, and catalog your collection.",
  icons: {
    icon: "/images/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <div className="min-h-screen bg-background text-foreground">{children}</div>
      </body>
    </html>
  );
}
