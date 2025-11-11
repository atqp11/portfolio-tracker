// lib/calculator.ts
export const calculatePosition = (
  stock: any,
  price: number,
  config: any
) => {
  // Ensure price is a valid positive number
  const validPrice = (!price || price <= 0 || isNaN(price)) ? 100.00 : price;
  
  const totalTarget = stock.cashAllocation / config.cashRatio;
  const shares = Math.floor(totalTarget / validPrice);
  const actualValue = shares * validPrice;
  const marginUsed = actualValue * config.marginRatio;
  const cashUsed = actualValue - marginUsed;
  
  return { 
    shares: shares || 0, 
    actualValue: actualValue || 0, 
    cashUsed: cashUsed || 0, 
    marginUsed: marginUsed || 0, 
    price: validPrice 
  };
};