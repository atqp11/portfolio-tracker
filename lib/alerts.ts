// lib/alerts.ts
import { get, set } from '@/lib/utils/idbStorage';

interface AlertState {
  stopLoss?: { triggered: boolean; value: number };
  takeProfit?: { triggered: boolean; value: number };
  marginCall?: { triggered: boolean; value: number; equityPercent: number };
}

const KEY = 'alerts';

export const checkAlerts = async (total: number, config: any): Promise<AlertState> => {
  const state = (await get<AlertState>(KEY)) || {};

  // Check stop-loss
  if (!state.stopLoss?.triggered && total <= config.stopLossValue) {
    state.stopLoss = { triggered: true, value: total };
    trigger('STOP-LOSS', `SELL ALL: $${total.toFixed(0)}`);
  }
  
  // Check take-profit
  if (!state.takeProfit?.triggered && total >= config.takeProfitValue) {
    state.takeProfit = { triggered: true, value: total };
    trigger('TAKE PROFIT', `Lock gains: $${total.toFixed(0)}`);
  }

  // Check margin call (equity % < 30%)
  // Equity = Account Value - Borrowed Amount
  // Equity % = (Equity / Account Value) × 100
  const borrowedAmount = config.initialMargin;
  const equity = total - borrowedAmount;
  const equityPercent = total > 0 ? (equity / total) * 100 : 0;
  const marginCallThreshold = 30; // 30% maintenance margin
  
  if (!state.marginCall?.triggered && equityPercent < marginCallThreshold && total > 0) {
    state.marginCall = { triggered: true, value: total, equityPercent };
    trigger('MARGIN CALL', `Equity ${equityPercent.toFixed(1)}% < 30%. Add funds or liquidate!`);
  }

  await set(KEY, state);
  return state;
};

const trigger = (type: string, msg: string) => {
  const audio = new Audio('/alert.wav');
  audio.play();
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(type, { body: msg });
  }
};

export const resetAlerts = async () => set(KEY, {});

// Calculate the account value at which margin call would be triggered
// Formula: Margin Call Value = Borrowed Amount / (1 - Maintenance Margin %)
export const calculateMarginCallThreshold = (borrowedAmount: number, maintenanceMargin: number = 0.30): number => {
  return borrowedAmount / (1 - maintenanceMargin);
};

// Calculate current equity percentage
export const calculateEquityPercent = (accountValue: number, borrowedAmount: number): number => {
  if (accountValue <= 0) return 0;
  const equity = accountValue - borrowedAmount;
  return (equity / accountValue) * 100;
};