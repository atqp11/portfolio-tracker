// Mock data for testing UI without API calls
// Using current market prices as of Nov 11, 2025 for cost basis
export const MOCK_PRICES = {
  // Energy stocks (Nov 11, 2025 prices)
  'CNQ': 84.50,
  'SU': 51.50,
  'TRMLF': 61.40,
  'AETUF': 25.20,
  'TRP': 59.50,
  
  // Copper stocks (Nov 11, 2025 prices)
  'FCX': 40.10,
  'COPX': 41.20,
  'ERO': 19.30,
  'HBM': 9.40,
};

// Initial cost basis for P&L calculations
// These represent the initial purchase prices (same as MOCK_PRICES for now)
export const COST_BASIS_PRICES = {
  // Energy stocks
  'CNQ': 84.50,
  'SU': 51.50,
  'TRMLF': 61.40,
  'AETUF': 25.20,
  'TRP': 59.50,
  
  // Copper stocks
  'FCX': 40.10,
  'COPX': 41.20,
  'ERO': 19.30,
  'HBM': 9.40,
};

// Portfolio initial values for reference
export const PORTFOLIO_INITIAL_VALUES = {
  energy: {
    totalValue: 20000,
    cash: 14000,
    margin: 6000,
    allocations: {
      'CNQ': 3500,    // 25% of cash
      'SU': 3500,     // 25% of cash
      'TRMLF': 2800,  // 20% of cash
      'AETUF': 2100,  // 15% of cash
      'TRP': 2100,    // 15% of cash
    }
  },
  copper: {
    totalValue: 10000,
    cash: 7000,
    margin: 3000,
    allocations: {
      'FCX': 2800,    // 40% of cash
      'COPX': 2100,   // 30% of cash
      'ERO': 1050,    // 15% of cash
      'HBM': 1050,    // 15% of cash
    }
  }
};

export const MOCK_PRICE_CHANGES = {
  'CNQ': 0.85,
  'SU': 0.50,
  'TRMLF': 1.20,
  'AETUF': 0.35,
  'TRP': 0.75,
  'FCX': 0.80,
  'COPX': 1.15,
  'ERO': 0.50,
  'HBM': 0.15,
};

// Set to true to use mock data instead of real API calls
export const USE_MOCK_DATA = true;
