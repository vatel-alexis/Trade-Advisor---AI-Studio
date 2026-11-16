import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";

import { AuthProvider, HeaderAuthStatus } from "@/components/AuthContext";
import { NavLinks } from "@/components/NavLinks";
import { PeaAlert } from "@/components/PeaAlert";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Advisor — Portefeuille PEA",
  description: "Répartition mensuelle d'ETF éligibles PEA, suivi de la performance et gestion de portefeuille",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a1122" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <header className="sticky top-0 z-20 border-b border-line bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
            <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3 md:py-3">
              <Link href="/pea" className="flex items-center gap-3" aria-label="Trading Advisor, Portefeuille PEA">
                <Image src="/mark-va.png" alt="" width={376} height={298} priority className="h-8 w-auto" />
                <span className="font-display text-[0.95rem] tracking-[0.08em] whitespace-nowrap">
                  <b className="font-extrabold">TRADING</b> <span className="font-light">ADVISOR</span>
                </span>
              </Link>
              <NavLinks />
              <HeaderAuthStatus />
            </nav>
            <PeaAlert />
          </header>
          <main className="mx-auto max-w-6xl px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] md:pt-10">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted">
              <span className="font-display tracking-[0.08em]">
                <b className="font-extrabold">VATEL</b> <span className="font-light">ALEXIS</span>
              </span>
              <span className="font-mono">Portefeuille PEA · Propositions mensuelles sans exécution d&apos;ordres</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

