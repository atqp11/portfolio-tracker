// lib/calculator.ts
export const calculatePosition = (
  stock: any,
  price: number,
  config: any
) => {
  // If price is unavailable, don't calculate
  if (!price || price <= 0 || isNaN(price)) {
    return { 
      shares: 0, 
      actualValue: 0, 
      cashUsed: 0, 
      marginUsed: 0, 
      price: 0 
    };
  }
  
  const totalTarget = stock.cashAllocation / config.cashRatio;
  const shares = Math.floor(totalTarget / price);
  const actualValue = shares * price;
  const marginUsed = actualValue * config.marginRatio;
  const cashUsed = actualValue - marginUsed;
  
  return { 
    shares: shares || 0, 
    actualValue: actualValue || 0, 
    cashUsed: cashUsed || 0, 
    marginUsed: marginUsed || 0, 
    price: price 
  };
};