/**
 * The alerts.ts file provides utility functions for managing and triggering financial alerts based on account values and configurations.
 * It is designed to monitor key financial thresholds such as stop-loss, take-profit, and margin call conditions.
 *
 * Key Components:
 *
 * AlertState Interface:
 * - Represents the state of various alerts.
 * - Properties:
 *   - stopLoss: Tracks whether the stop-loss condition is triggered and its value.
 *   - takeProfit: Tracks whether the take-profit condition is triggered and its value.
 *   - marginCall: Tracks whether the margin call condition is triggered, its value, and the equity percentage.
 *
 * checkAlerts Function:
 * - Purpose: Evaluates the current account value against configured thresholds and triggers alerts if conditions are met.
 * - Parameters:
 *   - total: The current account value.
 *   - config: Configuration object containing thresholds for stop-loss, take-profit, and initial margin.
 * - Logic:
 *   - Checks if the account value falls below the stop-loss threshold.
 *   - Checks if the account value exceeds the take-profit threshold.
 *   - Calculates equity percentage and checks if it falls below the margin call threshold (30% by default).
 * - Side Effects:
 *   - Plays an alert sound.
 *   - Displays a browser notification if permissions are granted.
 *   - Updates the alert state in IndexedDB storage.
 *
 * trigger Function:
 * - Purpose: Handles the actual alert notification process.
 * - Parameters:
 *   - type: The type of alert (e.g., "STOP-LOSS", "TAKE PROFIT").
 *   - msg: The message to display in the notification.
 * - Behavior:
 *   - Plays an audio alert.
 *   - Displays a browser notification if supported and permitted.
 *
 * resetAlerts Function:
 * - Purpose: Resets all alert states to their default values.
 * - Side Effects:
 *   - Clears the alert state in IndexedDB storage.
 *
 * calculateMarginCallThreshold Function:
 * - Purpose: Calculates the account value at which a margin call would be triggered.
 * - Parameters:
 *   - borrowedAmount: The amount borrowed.
 *   - maintenanceMargin: The maintenance margin percentage (default is 30%).
 * - Formula:
 *   - Margin Call Value = Borrowed Amount / (1 - Maintenance Margin)
 *
 * calculateEquityPercent Function:
 * - Purpose: Calculates the current equity percentage.
 * - Parameters:
 *   - accountValue: The total account value.
 *   - borrowedAmount: The amount borrowed.
 * - Formula:
 *   - Equity Percent = (Equity / Account Value) × 100
 * - Returns 0 if the account value is less than or equal to zero.
 *
 * Usage:
 * - The alerts.ts file is used to monitor financial thresholds and notify users when specific conditions are met.
 *
 * Triggering Alerts:
 * - The checkAlerts function is called periodically with the current account value and configuration.
 * - Alerts are triggered when thresholds are crossed.
 *
 * Resetting Alerts:
 * - The resetAlerts function can be used to clear all alert states, typically after user acknowledgment or reconfiguration.
 *
 * Calculations:
 * - The calculateMarginCallThreshold and calculateEquityPercent functions are utility methods for financial calculations related to margin calls and equity.
 *
 * This file is critical for ensuring users are notified of significant financial events in real-time, enhancing the application's utility and user experience.
 */

import { get, set } from '@lib/utils/idbStorage';

/**
 * Interface representing the state of various alerts.
 */
interface AlertState {
  /**
   * Stop-loss alert state.
   * @property triggered - Whether the stop-loss alert is triggered.
   * @property value - The account value at which the stop-loss was triggered.
   */
  stopLoss?: { triggered: boolean; value: number };

  /**
   * Take-profit alert state.
   * @property triggered - Whether the take-profit alert is triggered.
   * @property value - The account value at which the take-profit was triggered.
   */
  takeProfit?: { triggered: boolean; value: number };

  /**
   * Margin call alert state.
   * @property triggered - Whether the margin call alert is triggered.
   * @property value - The account value at which the margin call was triggered.
   * @property equityPercent - The equity percentage at the time of the margin call.
   */
  marginCall?: { triggered: boolean; value: number; equityPercent: number };
}

const KEY = 'alerts';

/**
 * Checks the current account value against configured thresholds and triggers alerts if conditions are met.
 *
 * @param total - The current account value.
 * @param config - Configuration object containing thresholds for stop-loss, take-profit, and initial margin.
 * @returns A promise resolving to the updated alert state.
 */
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

/**
 * Triggers an alert notification with a sound and browser notification.
 *
 * @param type - The type of alert (e.g., "STOP-LOSS", "TAKE PROFIT").
 * @param msg - The message to display in the notification.
 */
const trigger = (type: string, msg: string) => {
  const audio = new Audio('/alert.wav');
  audio.play();
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(type, { body: msg });
  }
};

/**
 * Resets all alert states to their default values.
 *
 * @returns A promise resolving when the alert state is cleared.
 */
export const resetAlerts = async () => set(KEY, {});

/**
 * Calculates the account value at which a margin call would be triggered.
 *
 * @param borrowedAmount - The amount borrowed.
 * @param maintenanceMargin - The maintenance margin percentage (default is 30%).
 * @returns The account value at which a margin call would be triggered.
 */
export const calculateMarginCallThreshold = (borrowedAmount: number, maintenanceMargin: number = 0.30): number => {
  return borrowedAmount / (1 - maintenanceMargin);
};

/**
 * Calculates the current equity percentage.
 *
 * @param accountValue - The total account value.
 * @param borrowedAmount - The amount borrowed.
 * @returns The equity percentage, or 0 if the account value is less than or equal to zero.
 */
export const calculateEquityPercent = (accountValue: number, borrowedAmount: number): number => {
  if (accountValue <= 0) return 0;
  const equity = accountValue - borrowedAmount;
  return (equity / accountValue) * 100;
};