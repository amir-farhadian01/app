/** Mirrors `lib/packageMargin.ts` for instant UI feedback (server remains source of truth). */

export interface PackageMargin {
  currency: string;
  bomCost: number;
  crossCurrencyLines: number;
  margin: number;
  marginPercent: number;
}

export function computePackageMargin(
  pkg: { finalPrice: number; currency: string },
  bom: Array<{ quantity: number; snapshotUnitPrice: number; snapshotCurrency: string }>,
): PackageMargin {
  const currency = pkg.currency;
  let bomCost = 0;
  let crossCurrencyLines = 0;
  for (const line of bom) {
    if (line.snapshotCurrency === currency) {
      bomCost += line.quantity * line.snapshotUnitPrice;
    } else {
      crossCurrencyLines += 1;
    }
  }
  const margin = pkg.finalPrice - bomCost;
  const marginPercent = pkg.finalPrice === 0 ? 0 : (margin / pkg.finalPrice) * 100;
  return { currency, bomCost, crossCurrencyLines, margin, marginPercent };
}
