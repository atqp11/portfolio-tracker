// Mock data for testing UI without API calls
export const MOCK_PRICES = {
  // Energy stocks
  'CNQ': 38.45,
  'SU': 52.30,
  'TRMKF': 68.20,
  'AETUF': 15.80,
  'TRP': 55.75,
  
  // Copper stocks
  'FCX': 45.20,
  'COPX': 47.85,
  'ERO.TO': 23.50,
  'HBM': 11.25,
};

export const MOCK_PRICE_CHANGES = {
  'CNQ': 0.85,
  'SU': -0.45,
  'TRMKF': 1.20,
  'AETUF': 0.35,
  'TRP': 2.07,
  'FCX': -0.80,
  'COPX': 1.15,
  'ERO.TO': 0.50,
  'HBM': -0.15,
};

// Set to true to use mock data instead of real API calls
export const USE_MOCK_DATA = true;
