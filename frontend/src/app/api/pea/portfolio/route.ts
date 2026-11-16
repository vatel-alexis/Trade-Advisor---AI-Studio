import { NextResponse } from "next/server";

import { getUserPortfolioFromDb, upsertUserPortfolioInDb } from "@/db/users.ts";
import { getPeaPortfolio, savePeaPortfolio, type PeaPortfolioConfig } from "@/lib/api";
import { adminAuth } from "@/lib/firebase-admin";
import { mockStore } from "@/lib/mockStore";

const DEFAULT_UID = "default-pea-investor";
const DEFAULT_EMAIL = "vatelalexis@gmail.com";

async function resolveUserFromRequest(request: Request): Promise<{ uid: string; email: string }> {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const decoded = await adminAuth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email ?? DEFAULT_EMAIL,
      };
    }
  }
  return { uid: DEFAULT_UID, email: DEFAULT_EMAIL };
}

export async function GET(request: Request) {
  try {
    const { uid, email } = await resolveUserFromRequest(request);
    if (process.env.SQL_HOST) {
      const dbData = await getUserPortfolioFromDb(uid, email);
      if (dbData) {
        return NextResponse.json(dbData);
      }
      const seeded = await upsertUserPortfolioInDb(uid, email, mockStore.getPortfolio(), {});
      return NextResponse.json(seeded);
    }
  } catch (error) {
    console.error("Failed to fetch portfolio from Cloud SQL:", error);
  }
  const fallback = await getPeaPortfolio();
  return NextResponse.json(fallback);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<PeaPortfolioConfig>;
    const { uid, email } = await resolveUserFromRequest(request);
    if (process.env.SQL_HOST) {
      const existing = (await getUserPortfolioFromDb(uid, email)) ?? mockStore.getPortfolio();
      const saved = await upsertUserPortfolioInDb(uid, email, existing, body);
      mockStore.savePortfolio(saved);
      return NextResponse.json(saved);
    }
    const saved = await savePeaPortfolio(body);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Failed to save portfolio:", error);
    return NextResponse.json({ detail: "Impossible d'enregistrer le portefeuille." }, { status: 500 });
  }
}
