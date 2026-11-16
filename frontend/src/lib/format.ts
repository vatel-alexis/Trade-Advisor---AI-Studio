const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD" });
const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euroExact = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("fr-FR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const usd = (value: number | null | undefined) => (value == null ? "—" : money.format(value));

export const eur = (value: number | null | undefined) => (value == null ? "—" : euro.format(value));

export const eur2 = (value: number | null | undefined) => (value == null ? "—" : euroExact.format(value));

export const signedEur = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${euro.format(value)}`;

export const pct = (value: number | null | undefined) => (value == null ? "—" : pct1.format(value));

export const signedPct = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${pct1.format(value)}`;

export const pnlClass = (value: number | null | undefined) =>
  value == null || value === 0
    ? ""
    : value > 0
      ? "text-success"
      : "text-danger";

export function day(value: string | null | undefined) {
  if (!value) return "—";
  // Dates without a time are calendar days: no time zone shift.
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

