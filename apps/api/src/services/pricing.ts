// 台電住宅用電累進費率（2025 年公告值）
// 修改費率時只需更新此常數，不影響演算法邏輯

const TIERS: { maxKwh: number; nonSummer: number; summer: number }[] = [
  { maxKwh: 120,      nonSummer: 1.68, summer: 1.68 },
  { maxKwh: 330,      nonSummer: 2.16, summer: 2.45 },
  { maxKwh: 500,      nonSummer: 3.03, summer: 3.70 },
  { maxKwh: 700,      nonSummer: 4.14, summer: 5.04 },
  { maxKwh: 1000,     nonSummer: 5.00, summer: 6.24 },
  { maxKwh: Infinity, nonSummer: 6.24, summer: 8.46 },
];

export interface TierBreakdown {
  tier: string;
  kwh: number;
  rate: number;
  subtotal: number;
}

export interface BillEstimate {
  amount: number;
  isSummer: boolean;
  breakdown: TierBreakdown[];
}

function isSummer(date: Date): boolean {
  const m = date.getMonth() + 1; // 1–12
  return m >= 6 && m <= 9;
}

export function calcBill(kwh: number, periodStart: Date, periodEnd: Date): BillEstimate {
  const summer = isSummer(periodStart) || isSummer(periodEnd);
  const rateKey = summer ? 'summer' : 'nonSummer';

  let remaining = Math.max(0, kwh);
  let prevMax = 0;
  let total = 0;
  const breakdown: TierBreakdown[] = [];

  for (const tier of TIERS) {
    if (remaining <= 0) break;
    const tierSize = tier.maxKwh === Infinity ? remaining : tier.maxKwh - prevMax;
    const used = Math.min(remaining, tierSize);
    const rate = tier[rateKey];
    const subtotal = Math.round(used * rate * 100) / 100;

    breakdown.push({
      tier: tier.maxKwh === Infinity ? `${prevMax + 1}+` : `${prevMax + 1}–${tier.maxKwh}`,
      kwh: used,
      rate,
      subtotal,
    });

    total += subtotal;
    remaining -= used;
    prevMax = tier.maxKwh;
  }

  return { amount: Math.round(total), isSummer: summer, breakdown };
}
