// lib/calculator.ts
export const calculatePosition = (
  stock: any,
  price: number,
  config: any
) => {
  const totalTarget = stock.cashAllocation / config.cashRatio;
  const shares = Math.floor(totalTarget / price);
  const actualValue = shares * price;
  const marginUsed = actualValue * config.marginRatio;
  const cashUsed = actualValue - marginUsed;
  return { shares, actualValue, cashUsed, marginUsed, price };
};