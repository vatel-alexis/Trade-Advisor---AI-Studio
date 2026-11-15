import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Montserrat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { NavLinks } from "@/components/NavLinks";
import { PeaAlert } from "@/components/PeaAlert";
import "./globals.css";

// Same type families as the CV site.
const heading = Montserrat({ subsets: ["latin"], weight: ["300", "500", "700", "800"], variable: "--font-heading" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const code = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-code" });

export const metadata: Metadata = {
  title: "Trading Advisor — Portefeuille PEA",
  description: "Répartition mensuelle d'ETF éligibles PEA en suivi de tendance",
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
    <html lang="fr" className={`${heading.variable} ${body.variable} ${code.variable}`}>
      <body className="min-h-dvh antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 pt-3 md:py-3">
            <Link href="/pea" className="flex items-center gap-3" aria-label="Trading Advisor, Portefeuille PEA">
              <Image src="/mark-va.png" alt="" width={376} height={298} priority className="h-8 w-auto" />
              <span className="font-display text-[0.95rem] tracking-[0.08em] whitespace-nowrap">
                <b className="font-extrabold">TRADING</b> <span className="font-light">ADVISOR</span>
              </span>
            </Link>
            <NavLinks />
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
      </body>
    </html>
  );
}
