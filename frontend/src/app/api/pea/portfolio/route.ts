import { NextResponse } from "next/server";

import { getPeaPortfolio, savePeaPortfolio, type PeaPortfolioConfig } from "@/lib/api";

export async function GET() {
  const data = await getPeaPortfolio();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<PeaPortfolioConfig>;
    const saved = await savePeaPortfolio(body);
    return NextResponse.json(saved);
  } catch {
    return NextResponse.json({ detail: "Données de portefeuille invalides." }, { status: 400 });
  }
}
