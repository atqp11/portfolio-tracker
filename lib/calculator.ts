// lib/calculator.ts

// ============================================================================
// PORTFOLIO CALCULATIONS
// ============================================================================

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

// ============================================================================
// FUNDAMENTAL METRICS CALCULATIONS
// ============================================================================

/**
 * Helper to safely parse numeric values from API strings
 */
const parseNum = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === 'None' || value === '') {
    return 0;
  }
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

/**
 * Valuation indicator: undervalued, fair, overvalued
 */
export type ValuationIndicator = 'undervalued' | 'fair' | 'overvalued';

export interface FundamentalMetrics {
  // Valuation Ratios
  pe: number | null;              // P/E Ratio
  forwardPE: number | null;       // Forward P/E
  pb: number | null;              // P/B Ratio
  evToEbitda: number | null;      // EV/EBITDA
  
  // Profitability Ratios
  roe: number | null;             // Return on Equity (%)
  roic: number | null;            // Return on Invested Capital (%)
  roa: number | null;             // Return on Assets (%)
  netMargin: number | null;       // Net Profit Margin (%)
  operatingMargin: number | null; // Operating Margin (%)
  grossMargin: number | null;     // Gross Margin (%)
  
  // Leverage Ratios
  debtToEquity: number | null;    // Debt/Equity Ratio
  interestCoverage: number | null; // Interest Coverage
  currentRatio: number | null;    // Current Ratio
  quickRatio: number | null;      // Quick Ratio
  
  // Intrinsic Value
  grahamNumber: number | null;    // Graham Number
  marginOfSafety: number | null;  // Margin of Safety (%)
  
  // Valuation Indicators
  peIndicator: ValuationIndicator | null;
  pbIndicator: ValuationIndicator | null;
  evEbitdaIndicator: ValuationIndicator | null;
}

/**
 * Calculate P/E Ratio
 * Formula: Price / EPS
 */
export const calculatePE = (price: number, eps: number): number | null => {
  if (eps <= 0) return null;
  return price / eps;
};

/**
 * Calculate P/B Ratio
 * Formula: Price / Book Value per Share
 */
export const calculatePB = (price: number, bookValue: number): number | null => {
  if (bookValue <= 0) return null;
  return price / bookValue;
};

/**
 * Calculate ROE (Return on Equity)
 * Formula: (Net Income / Shareholder Equity) * 100
 */
export const calculateROE = (
  netIncome: number,
  equity: number,
  priorEquity?: number
): number | null => {
  // Use average shareholders' equity when prior year value is available
  const avgEquity = (priorEquity && priorEquity > 0) ? (equity + priorEquity) / 2 : equity;
  if (avgEquity <= 0) return null;

  // Normalize units if netIncome and avgEquity are off by a factor of 1000 or more
  let ni = netIncome;
  let eq = avgEquity;
  if (Math.abs(ni) > 0 && Math.abs(eq) > 0) {
    const ratio = Math.max(Math.abs(ni), Math.abs(eq)) / Math.min(Math.abs(ni), Math.abs(eq));
    if (ratio > 1000) {
      if (Math.abs(ni) > Math.abs(eq)) {
        ni = ni / 1000;
      } else {
        eq = eq / 1000;
      }
    }
  }

  return (ni / eq) * 100;
};

/**
 * Calculate ROIC (Return on Invested Capital)
 * Formula: (NOPAT / Invested Capital) * 100
 * NOPAT = EBIT * (1 - Tax Rate)
 * Invested Capital = Total Debt + Total Equity
 */
export const calculateROIC = (
  ebit: number,
  taxRate: number,
  totalDebt: number,
  totalEquity: number
): number | null => {
  const investedCapital = totalDebt + totalEquity;
  if (investedCapital <= 0) return null;
  
  const nopat = ebit * (1 - taxRate);
  return (nopat / investedCapital) * 100;
};

/**
 * Calculate ROA (Return on Assets)
 * Formula: (Net Income / Total Assets) * 100
 */
export const calculateROA = (netIncome: number, totalAssets: number): number | null => {
  if (totalAssets <= 0) return null;
  return (netIncome / totalAssets) * 100;
};

/**
 * Calculate Net Margin
 * Formula: (Net Income / Revenue) * 100
 */
export const calculateNetMargin = (netIncome: number, revenue: number): number | null => {
  if (revenue <= 0) return null;
  return (netIncome / revenue) * 100;
};

/**
 * Calculate Operating Margin
 * Formula: (Operating Income / Revenue) * 100
 */
export const calculateOperatingMargin = (operatingIncome: number, revenue: number): number | null => {
  if (revenue <= 0) return null;
  return (operatingIncome / revenue) * 100;
};

/**
 * Calculate Gross Margin
 * Formula: (Gross Profit / Revenue) * 100
 */
export const calculateGrossMargin = (grossProfit: number, revenue: number): number | null => {
  if (revenue <= 0) return null;
  return (grossProfit / revenue) * 100;
};

/**
 * Calculate Debt/Equity Ratio
 * Formula: Total Debt / Total Equity
 */
export const calculateDebtToEquity = (totalDebt: number, totalEquity: number): number | null => {
  if (totalEquity <= 0) return null;
  return totalDebt / totalEquity;
};

/**
 * Calculate Interest Coverage
 * Formula: EBIT / Interest Expense
 */
export const calculateInterestCoverage = (ebit: number, interestExpense: number): number | null => {
  if (interestExpense <= 0) return null;
  return ebit / interestExpense;
};

/**
 * Calculate Current Ratio
 * Formula: Current Assets / Current Liabilities
 */
export const calculateCurrentRatio = (currentAssets: number, currentLiabilities: number): number | null => {
  if (currentLiabilities <= 0) return null;
  return currentAssets / currentLiabilities;
};

/**
 * Calculate Quick Ratio
 * Formula: (Current Assets - Inventory) / Current Liabilities
 */
export const calculateQuickRatio = (
  currentAssets: number,
  inventory: number,
  currentLiabilities: number
): number | null => {
  if (currentLiabilities <= 0) return null;
  return (currentAssets - inventory) / currentLiabilities;
};

/**
 * Calculate Graham Number (Intrinsic Value)
 * Formula: √(22.5 × EPS × Book Value per Share)
 */
export const calculateGrahamNumber = (eps: number, bookValue: number): number | null => {
  if (eps <= 0 || bookValue <= 0) return null;
  return Math.sqrt(22.5 * eps * bookValue);
};

/**
 * Calculate Margin of Safety
 * Formula: ((Intrinsic Value - Current Price) / Intrinsic Value) * 100
 */
export const calculateMarginOfSafety = (intrinsicValue: number, currentPrice: number): number | null => {
  if (intrinsicValue <= 0) return null;
  return ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
};

/**
 * Get valuation indicator based on metric comparison
 */
export const getValuationIndicator = (
  value: number,
  lowThreshold: number,
  highThreshold: number
): ValuationIndicator => {
  if (value < lowThreshold) return 'undervalued';
  if (value > highThreshold) return 'overvalued';
  return 'fair';
};

/**
 * Calculate all fundamental metrics from Alpha Vantage data
 */
export const calculateFundamentalMetrics = (
  overview: any,
  income: any,
  balance: any,
  price: number
): FundamentalMetrics => {
  // Parse values from overview
  const eps = parseNum(overview?.DilutedEPSTTM || overview?.EPS);
  const bookValue = parseNum(overview?.BookValue);
  const roe = parseNum(overview?.ReturnOnEquityTTM);
  const roa = parseNum(overview?.ReturnOnAssetsTTM);
  const peRatio = parseNum(overview?.PERatio);
  const forwardPE = parseNum(overview?.ForwardPE);
  const pbRatio = parseNum(overview?.PriceToBookRatio);
  const evToEbitda = parseNum(overview?.EVToEBITDA);
  const profitMargin = parseNum(overview?.ProfitMargin);
  const operatingMargin = parseNum(overview?.OperatingMarginTTM);
  
  // Get latest financial data
  const latestIncome = income?.annualReports?.[0];
  const latestBalance = balance?.annualReports?.[0];
  const priorBalance = balance?.annualReports?.[1];
  
  // Parse income statement
  const revenue = parseNum(latestIncome?.totalRevenue);
  const netIncome = parseNum(latestIncome?.netIncome);
  const operatingIncome = parseNum(latestIncome?.operatingIncome);
  const grossProfit = parseNum(latestIncome?.grossProfit);
  const ebit = parseNum(latestIncome?.ebit);
  const ebitda = parseNum(latestIncome?.ebitda);
  const interestExpense = parseNum(latestIncome?.interestExpense);
  const taxExpense = parseNum(latestIncome?.incomeTaxExpense);
  
  // Parse balance sheet
  const totalAssets = parseNum(latestBalance?.totalAssets);
  const currentAssets = parseNum(latestBalance?.totalCurrentAssets);
  const currentLiabilities = parseNum(latestBalance?.totalCurrentLiabilities);
  const totalLiabilities = parseNum(latestBalance?.totalLiabilities);
  const totalEquity = parseNum(latestBalance?.totalShareholderEquity);
  const priorTotalEquity = parseNum(priorBalance?.totalShareholderEquity);
  const inventory = parseNum(latestBalance?.inventory);
  const longTermDebt = parseNum(latestBalance?.longTermDebt);
  const shortTermDebt = parseNum(latestBalance?.shortTermDebt);
  const totalDebt = longTermDebt + shortTermDebt;
  
  // Calculate tax rate
  const taxRate = netIncome > 0 ? taxExpense / (netIncome + taxExpense) : 0.21; // Default to 21% if can't calculate
  
  // Calculate metrics
  const pe = peRatio || calculatePE(price, eps);
  const pb = pbRatio || calculatePB(price, bookValue);
  const roic = calculateROIC(ebit, taxRate, totalDebt, totalEquity);
  const calculatedROA = roa || calculateROA(netIncome, totalAssets);
  const netMargin = profitMargin * 100 || calculateNetMargin(netIncome, revenue);
  const calcOperatingMargin = operatingMargin * 100 || calculateOperatingMargin(operatingIncome, revenue);
  const grossMargin = calculateGrossMargin(grossProfit, revenue);
  const debtToEquity = calculateDebtToEquity(totalDebt, totalEquity);
  const interestCoverage = calculateInterestCoverage(ebit, interestExpense);
  const currentRatio = calculateCurrentRatio(currentAssets, currentLiabilities);
  const quickRatio = calculateQuickRatio(currentAssets, inventory, currentLiabilities);
  const grahamNumber = calculateGrahamNumber(eps, bookValue);
  const marginOfSafety = grahamNumber ? calculateMarginOfSafety(grahamNumber, price) : null;
  
  // Valuation indicators (using industry standard thresholds)
  const peIndicator = pe ? getValuationIndicator(pe, 0, 20) : null;  // <15 undervalued, >25 overvalued
  const pbIndicator = pb ? getValuationIndicator(pb, 0, 2) : null;   // <1 undervalued, >3 overvalued
  // ROE: prefer calculated value using average shareholders' equity (if prior year available)
  const avgEquity = priorTotalEquity > 0 ? (totalEquity + priorTotalEquity) / 2 : totalEquity;
  const calculatedROE = calculateROE(netIncome, totalEquity, priorTotalEquity);
  const evEbitdaIndicator = evToEbitda ? getValuationIndicator(evToEbitda, 0, 12) : null; // <10 undervalued, >15 overvalued
  
  return {
    pe,
    forwardPE: forwardPE || null,
    pb,
    evToEbitda: evToEbitda || null,
    roe: calculatedROE,
    roic,
    roa: calculatedROA,
    netMargin,
    operatingMargin: calcOperatingMargin,
    grossMargin,
    debtToEquity,
    interestCoverage,
    currentRatio,
    quickRatio,
    grahamNumber,
    marginOfSafety,
    peIndicator,
    pbIndicator,
    evEbitdaIndicator
  };
};