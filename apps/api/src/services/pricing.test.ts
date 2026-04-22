import { calcBill } from './pricing';

const NON_SUMMER = new Date('2025-01-01'); // 非夏月
const SUMMER     = new Date('2025-07-01'); // 夏月

describe('calcBill', () => {
  describe('季節判斷', () => {
    it('1月 → 非夏月', () => {
      expect(calcBill(100, NON_SUMMER, NON_SUMMER).isSummer).toBe(false);
    });
    it('7月 → 夏月', () => {
      expect(calcBill(100, SUMMER, SUMMER).isSummer).toBe(true);
    });
    it('periodEnd 落在夏月時整期視為夏月', () => {
      expect(calcBill(100, new Date('2025-05-01'), new Date('2025-06-30')).isSummer).toBe(true);
    });
  });

  describe('非夏月費率', () => {
    it('0 度 → NT$0', () => {
      expect(calcBill(0, NON_SUMMER, NON_SUMMER).amount).toBe(0);
    });

    it('120 度（第一級距上限）', () => {
      // 120 × 1.68 = 201.6 → 202
      const { amount, breakdown } = calcBill(120, NON_SUMMER, NON_SUMMER);
      expect(breakdown[0].kwh).toBe(120);
      expect(amount).toBe(202);
    });

    it('121 度（跨第二級距）', () => {
      // 120 × 1.68 + 1 × 2.16 = 201.6 + 2.16 = 203.76 → 204
      const { amount } = calcBill(121, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(204);
    });

    it('330 度（第二級距上限）', () => {
      // 120×1.68 + 210×2.16 = 201.6 + 453.6 = 655.2 → 655
      const { amount } = calcBill(330, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(655);
    });

    it('500 度（第三級距上限）', () => {
      // 120×1.68 + 210×2.16 + 170×3.03 = 201.6 + 453.6 + 515.1 = 1170.3 → 1170
      const { amount } = calcBill(500, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(1170);
    });

    it('700 度（第四級距上限）', () => {
      // +200×4.14 = 828 → 1998
      const { amount } = calcBill(700, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(1998);
    });

    it('1000 度（第五級距上限）', () => {
      // +300×5.00 = 1500 → 3498
      const { amount } = calcBill(1000, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(3498);
    });

    it('1500 度（進入第六級距）', () => {
      // +500×6.24 = 3120 → 6618
      const { amount } = calcBill(1500, NON_SUMMER, NON_SUMMER);
      expect(amount).toBe(6618);
    });
  });

  describe('夏月費率', () => {
    it('120 度（第一級距，與非夏月相同）', () => {
      expect(calcBill(120, SUMMER, SUMMER).amount).toBe(202);
    });

    it('330 度（第二夏月費率 2.45）', () => {
      // 120×1.68 + 210×2.45 = 201.6 + 514.5 = 716.1 → 716
      const { amount } = calcBill(330, SUMMER, SUMMER);
      expect(amount).toBe(716);
    });

    it('夏月 1000 度應高於非夏月', () => {
      const summer = calcBill(1000, SUMMER, SUMMER).amount;
      const nonSummer = calcBill(1000, NON_SUMMER, NON_SUMMER).amount;
      expect(summer).toBeGreaterThan(nonSummer);
    });
  });

  describe('breakdown 結構', () => {
    it('330 度應回傳 2 筆 breakdown（只用到前兩級距）', () => {
      const { breakdown } = calcBill(330, NON_SUMMER, NON_SUMMER);
      expect(breakdown).toHaveLength(2);
    });

    it('breakdown 各 subtotal 加總等於 amount', () => {
      const { amount, breakdown } = calcBill(750, NON_SUMMER, NON_SUMMER);
      const sum = breakdown.reduce((s, b) => s + b.subtotal, 0);
      expect(Math.round(sum)).toBe(amount);
    });
  });
});
