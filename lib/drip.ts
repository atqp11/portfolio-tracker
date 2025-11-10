// lib/drip.ts
import { get, set } from './storage';

export const addDividend = async (symbol: string, amount: number) => {
  const state = (await get<Record<string, number>>('drip')) || {};
  state[symbol] = (state[symbol] || 0) + amount;
  await set('drip', state);
};

export const reinvestDRIP = async (symbol: string, price: number): Promise<number> => {
  const state = (await get<Record<string, number>>('drip')) || {};
  const cash = state[symbol] || 0;
  if (cash < price) return 0;
  const shares = Math.floor(cash / price);
  state[symbol] = cash - shares * price;
  await set('drip', state);
  return shares;
};