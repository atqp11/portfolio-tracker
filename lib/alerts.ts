// lib/alerts.ts
import { get, set } from './storage';

interface AlertState {
  stopLoss?: { triggered: boolean; value: number };
  takeProfit?: { triggered: boolean; value: number };
}

const KEY = 'alerts';

export const checkAlerts = async (total: number, config: any): Promise<AlertState> => {
  const state = (await get<AlertState>(KEY)) || {};

  if (!state.stopLoss?.triggered && total <= config.stopLossValue) {
    state.stopLoss = { triggered: true, value: total };
    trigger('STOP-LOSS', `SELL ALL: $${total.toFixed(0)}`);
  }
  if (!state.takeProfit?.triggered && total >= config.takeProfitValue) {
    state.takeProfit = { triggered: true, value: total };
    trigger('TAKE PROFIT', `Lock gains: $${total.toFixed(0)}`);
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