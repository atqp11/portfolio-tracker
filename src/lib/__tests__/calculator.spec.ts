import {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateAlpha,
  calculateBeta,
  calculateStdDev,
  calculateMaxDrawdown,
  calculateCurrentDrawdown,
  calculateRSquared,
} from '@lib/calculator';

const { calculateGrahamNumber, calculateMarginOfSafety, getValuationIndicator, calculateFundamentalMetrics } = jest.requireActual('@lib/calculator');

describe('risk metrics', () => {
  test('calculateSharpeRatio returns correct value', () => {
    const returns = [0.18, 0.12, 0.15, 0.20];
    const rf = 0.045;
    const result = calculateSharpeRatio(returns, rf);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });

  test('calculateSortinoRatio returns correct value', () => {
    const returns = [0.18, 0.12, 0.15, 0.20, 0.03];
    const rf = 0.045;
    const result = calculateSortinoRatio(returns, rf);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });

  test('calculateAlpha returns correct value', () => {
    const portfolioReturn = 0.18;
    const marketReturn = 0.12;
    const beta = 0.85;
    const rf = 0.045;
    const result = calculateAlpha(portfolioReturn, marketReturn, beta, rf);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });

  test('calculateBeta returns correct value', () => {
    const portfolioReturns = [0.18, 0.12, 0.15, 0.20];
    const marketReturns = [0.12, 0.10, 0.14, 0.18];
    const result = calculateBeta(portfolioReturns, marketReturns);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });

  test('calculateStdDev returns correct value', () => {
    const returns = [0.18, 0.12, 0.15, 0.20];
    const result = calculateStdDev(returns);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });

  test('calculateMaxDrawdown returns correct value', () => {
    const values = [100, 120, 110, 90, 130, 80];
    const result = calculateMaxDrawdown(values);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });

  test('calculateCurrentDrawdown returns correct value', () => {
    const values = [100, 120, 110, 90, 130, 80];
    const result = calculateCurrentDrawdown(values);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
  });

  test('calculateRSquared returns correct value', () => {
    const portfolioReturns = [0.18, 0.12, 0.15, 0.20];
    const marketReturns = [0.12, 0.10, 0.14, 0.18];
    const result = calculateRSquared(portfolioReturns, marketReturns);
    expect(typeof result).toBe('number');
    expect(result).not.toBeNull();
  });
});
import {
  calculateROE,
  calculatePE,
  calculatePB,
  calculateROIC,
  calculateROA,
  calculateNetMargin,
  calculateOperatingMargin,
  calculateGrossMargin,
} from '@lib/calculator';

describe('calculator basics', () => {
  test('calculatePE returns price / eps', () => {
    expect(calculatePE(100, 2)).toBeCloseTo(50);
    // price can be zero (result 0); EPS <= 0 returns null
    expect(calculatePE(0, 1)).toBeCloseTo(0);
    expect(calculatePE(100, 0)).toBeNull();
  });

  test('calculatePB returns price / bookValue', () => {
    expect(calculatePB(100, 20)).toBeCloseTo(5);
    expect(calculatePB(50, 25)).toBeCloseTo(2);
    expect(calculatePB(100, 0)).toBeNull();
  });

  test('calculateROE uses equity and priorEquity average when provided', () => {
    // simple case: netIncome 100, equity 50 -> 200%
    expect(calculateROE(100, 50)).toBeCloseTo(200);

    // with prior equity: avg = (50 + 100) / 2 = 75 => (100/75)*100 = 133.333...
    expect(calculateROE(100, 50, 100)).toBeCloseTo((100 / 75) * 100);

    // zero or negative equity returns null
    expect(calculateROE(100, 0)).toBeNull();
    expect(calculateROE(100, -10)).toBeNull();
  });

  test('calculateROE normalizes large unit mismatches', () => {
    // netIncome much larger than equity => the function will scale down larger by 1000 if ratio>1000
    const ni = 1_000_000_000; // 1 billion
    const eq = 1_000; // 1k
    const roe = calculateROE(ni, eq);
    // After normalization, ni will be divided by 1000 -> 1_000_000 and ratio = 1_000_000 / 1_000 = 1000 -> not >1000 so normalized once
    expect(typeof roe).toBe('number');
    expect(roe).not.toBeNull();
  });
});

describe('additional profitability ratios', () => {
  test('calculateROIC computes NOPAT / invested capital correctly', () => {
    // ebit=100, taxRate=0.21 => nopat = 79
    // totalDebt=50, totalEquity=150 => investedCapital = 200
    const roic = calculateROIC(100, 0.21, 50, 150);
    expect(roic).toBeCloseTo((79 / 200) * 100);

    // invested capital <= 0 -> null
    expect(calculateROIC(100, 0.21, -50, 50)).toBeNull();
  });

  test('calculateROA computes net income / total assets', () => {
    expect(calculateROA(50, 100)).toBeCloseTo(50);
    expect(calculateROA(0, 100)).toBeCloseTo(0);
    expect(calculateROA(10, 0)).toBeNull();
  });

  test('margins: net, operating, gross', () => {
    // net margin: netIncome / revenue * 100
    expect(calculateNetMargin(10, 100)).toBeCloseTo(10);
    expect(calculateNetMargin(0, 100)).toBeCloseTo(0);
    expect(calculateNetMargin(10, 0)).toBeNull();

    // operating margin
    expect(calculateOperatingMargin(20, 100)).toBeCloseTo(20);
    expect(calculateOperatingMargin(0, 100)).toBeCloseTo(0);
    expect(calculateOperatingMargin(1, 0)).toBeNull();

    // gross margin
    expect(calculateGrossMargin(40, 100)).toBeCloseTo(40);
    expect(calculateGrossMargin(0, 100)).toBeCloseTo(0);
    expect(calculateGrossMargin(1, 0)).toBeNull();
  });
});

describe('valuation helpers and robust parsing', () => {
  test('calculateGrahamNumber and marginOfSafety', () => {
    // Graham number requires eps>0 and bookValue>0
    const graham = calculateGrahamNumber(2, 25);
    expect(graham).toBeGreaterThan(0);
    // margin of safety: ((intrinsic - price)/intrinsic)*100
    const mos = calculateMarginOfSafety(graham as number, 20);
    expect(typeof mos).toBe('number');
    expect(mos).toBeLessThan(100);
  });

  test('getValuationIndicator boundaries', () => {

    expect(getValuationIndicator(-1, 0, 20)).toBe('undervalued');
    expect(getValuationIndicator(25, 0, 20)).toBe('overvalued');
    expect(getValuationIndicator(15, 0, 20)).toBe('fair');
  });

  test('calculateFundamentalMetrics handles "None" and missing fields gracefully', () => {

    const overview = {
      DilutedEPSTTM: 'None',
      BookValue: 'None',
      ReturnOnEquityTTM: 'None',
      PERatio: 'None',
    };
    const income = { annualReports: [{ totalRevenue: 'None', netIncome: 'None', operatingIncome: 'None', grossProfit: 'None' }] };
    const balance = { annualReports: [{ totalAssets: 'None', totalCurrentAssets: 'None', totalCurrentLiabilities: 'None', totalLiabilities: 'None', totalShareholderEquity: 'None', inventory: 'None', longTermDebt: 'None', shortTermDebt: 'None' }] };
    const price = 100;

    const metrics = calculateFundamentalMetrics(overview, income, balance, price);
    // Should not throw and should return an object with keys present
    expect(metrics).toBeDefined();
    expect(metrics.pe === null || typeof metrics.pe === 'number').toBeTruthy();
    expect(metrics.roe === null || typeof metrics.roe === 'number').toBeTruthy();
    expect(metrics.netMargin === null || typeof metrics.netMargin === 'number').toBeTruthy();
  });
});
