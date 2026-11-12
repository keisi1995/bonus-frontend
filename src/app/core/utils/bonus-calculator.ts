import { BonusTypes } from '../models/catalog';
import { BonusAmounts } from '../models/bonus';

/**
 * Redondea a 2 decimales con el medio hacia arriba (0.125 → 0.13), igual que el backend.
 * toPrecision(15) elimina el ruido de coma flotante (1.005 * 100 = 100.49999999999999).
 */
export function roundMoney(value: number): number {
  const cents = Number((Math.abs(value) * 100).toPrecision(15));
  return (Math.sign(value) * Math.round(cents)) / 100;
}

/** Vista previa del cálculo. El monto definitivo lo calcula y guarda el backend. */
export function calculateBonus(
  bonusTypeId: number,
  bonusValue: number,
  monthlySalary: number,
  taxRate: number,
): BonusAmounts {
  const grossAmount =
    bonusTypeId === BonusTypes.FixedAmount
      ? roundMoney(bonusValue)
      : roundMoney((monthlySalary * bonusValue) / 100);
  const taxAmount = roundMoney((grossAmount * taxRate) / 100);
  return { grossAmount, taxAmount, netAmount: roundMoney(grossAmount - taxAmount) };
}
