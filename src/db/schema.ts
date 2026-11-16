import { relations } from "drizzle-orm";
import { doublePrecision, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const peaUserPortfolios = pgTable("pea_user_portfolios", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid")
    .notNull()
    .unique()
    .references(() => users.uid),
  inputMode: text("input_mode").notNull().default("eur"),
  targetLevel: text("target_level").notNull().default("moyen"),
  totalCapital: doublePrecision("total_capital").notNull().default(25000),
  cashAvailable: doublePrecision("cash_available").notNull().default(1500),
  holdingsEur: jsonb("holdings_eur").$type<Record<string, number>>().notNull(),
  holdingsPct: jsonb("holdings_pct").$type<Record<string, number>>().notNull(),
  simInitialCapital: doublePrecision("sim_initial_capital").notNull().default(10000),
  simMonthlyDca: doublePrecision("sim_monthly_dca").notNull().default(200),
  simHorizon: text("sim_horizon").notNull().default("all"),
  simBenchmarks: jsonb("sim_benchmarks").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const peaReports = pgTable("pea_reports", {
  id: serial("id").primaryKey(),
  asOf: text("as_of").notNull(),
  signalDay: text("signal_day").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  portfolios: many(peaUserPortfolios),
}));

export const peaUserPortfoliosRelations = relations(peaUserPortfolios, ({ one }) => ({
  user: one(users, {
    fields: [peaUserPortfolios.userUid],
    references: [users.uid],
  }),
}));
