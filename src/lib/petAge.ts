export function ageTextToMonths(value: string) {
  const normalized = value.trim().toLowerCase();
  const amount = Number.parseFloat(normalized.replace(',', '.'));
  if (!Number.isFinite(amount) || amount < 0) return null;
  const months = /month|mo\b/.test(normalized) ? amount : amount * 12;
  return Math.min(480, Math.round(months));
}
