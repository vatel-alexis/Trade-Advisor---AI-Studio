import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { peaUserPortfolios, users } from "./schema.ts";
import type { PeaPortfolioConfig } from "../lib/api.ts";

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getUserPortfolioFromDb(uid: string, email: string): Promise<PeaPortfolioConfig | null> {
  try {
    await getOrCreateUser(uid, email);
    const rows = await db
      .select()
      .from(peaUserPortfolios)
      .innerJoin(users, eq(peaUserPortfolios.userUid, users.uid))
      .where(eq(users.uid, uid))
      .limit(1);

    const row = rows[0]?.pea_user_portfolios;
    if (!row) return null;

    return {
      input_mode: row.inputMode === "pct" ? "pct" : "eur",
      target_level: row.targetLevel,
      total_capital: row.totalCapital,
      cash_available: row.cashAvailable,
      holdings_eur: row.holdingsEur ?? {},
      holdings_pct: row.holdingsPct ?? {},
      sim_initial_capital: row.simInitialCapital,
      sim_monthly_dca: row.simMonthlyDca,
      sim_horizon: row.simHorizon,
      sim_benchmarks: row.simBenchmarks ?? ["sp500", "nasdaq", "world"],
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  } catch (error) {
    console.error("Database query failed in getUserPortfolioFromDb:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertUserPortfolioInDb(
  uid: string,
  email: string,
  current: PeaPortfolioConfig,
  patch: Partial<PeaPortfolioConfig>,
): Promise<PeaPortfolioConfig> {
  try {
    await getOrCreateUser(uid, email);

    const nextInputMode = patch.input_mode === "pct" ? "pct" : patch.input_mode === "eur" ? "eur" : current.input_mode;
    const nextTargetLevel = patch.target_level ?? current.target_level;
    const nextTotalCapital =
      typeof patch.total_capital === "number" ? Math.max(0, patch.total_capital) : current.total_capital;
    const nextCashAvailable =
      typeof patch.cash_available === "number" ? Math.max(0, patch.cash_available) : current.cash_available;
    const nextHoldingsEur = patch.holdings_eur ?? current.holdings_eur;
    const nextHoldingsPct = patch.holdings_pct ?? current.holdings_pct;
    const nextSimInitialCapital =
      typeof patch.sim_initial_capital === "number"
        ? Math.max(100, patch.sim_initial_capital)
        : current.sim_initial_capital;
    const nextSimMonthlyDca =
      typeof patch.sim_monthly_dca === "number" ? Math.max(0, patch.sim_monthly_dca) : current.sim_monthly_dca;
    const nextSimHorizon = patch.sim_horizon ?? current.sim_horizon;
    const nextSimBenchmarks = Array.isArray(patch.sim_benchmarks) ? patch.sim_benchmarks : current.sim_benchmarks;
    const now = new Date();

    const result = await db
      .insert(peaUserPortfolios)
      .values({
        userUid: uid,
        inputMode: nextInputMode,
        targetLevel: nextTargetLevel,
        totalCapital: nextTotalCapital,
        cashAvailable: nextCashAvailable,
        holdingsEur: nextHoldingsEur,
        holdingsPct: nextHoldingsPct,
        simInitialCapital: nextSimInitialCapital,
        simMonthlyDca: nextSimMonthlyDca,
        simHorizon: nextSimHorizon,
        simBenchmarks: nextSimBenchmarks,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: peaUserPortfolios.userUid,
        set: {
          inputMode: nextInputMode,
          targetLevel: nextTargetLevel,
          totalCapital: nextTotalCapital,
          cashAvailable: nextCashAvailable,
          holdingsEur: nextHoldingsEur,
          holdingsPct: nextHoldingsPct,
          simInitialCapital: nextSimInitialCapital,
          simMonthlyDca: nextSimMonthlyDca,
          simHorizon: nextSimHorizon,
          simBenchmarks: nextSimBenchmarks,
          updatedAt: now,
        },
      })
      .returning();

    const row = result[0];
    return {
      input_mode: row.inputMode === "pct" ? "pct" : "eur",
      target_level: row.targetLevel,
      total_capital: row.totalCapital,
      cash_available: row.cashAvailable,
      holdings_eur: row.holdingsEur ?? {},
      holdings_pct: row.holdingsPct ?? {},
      sim_initial_capital: row.simInitialCapital,
      sim_monthly_dca: row.simMonthlyDca,
      sim_horizon: row.simHorizon,
      sim_benchmarks: row.simBenchmarks ?? ["sp500", "nasdaq", "world"],
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : now.toISOString(),
    };
  } catch (error) {
    console.error("Database query failed in upsertUserPortfolioInDb:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
