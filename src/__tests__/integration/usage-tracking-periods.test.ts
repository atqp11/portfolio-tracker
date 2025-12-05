/**
 * Usage Tracking Period Tests
 * 
 * Tests the timestamp and period handling for usage tracking:
 * 1. Daily periods use UTC midnight boundaries
 * 2. Monthly periods use UTC first-of-month boundaries
 * 3. Queries correctly distinguish daily vs monthly records
 * 4. Microsecond precision differences don't break queries
 */

import { getTierConfig } from '@lib/tiers/config';

// Mock data representing what the database stores
const createDailyRecord = (dateStr: string, usage: Partial<{
  chat_queries: number;
  portfolio_analysis: number;
  portfolio_changes: number;
  sec_filings: number;
}> = {}) => {
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  
  // DB stores with microsecond precision: 23:59:59.999999
  const endTime = new Date(start);
  endTime.setUTCHours(23, 59, 59, 999);
  // Simulate microseconds by adding to the string
  const endStr = endTime.toISOString().replace('.999Z', '.999999+00');
  
  return {
    id: `daily-${dateStr}`,
    user_id: 'test-user',
    tier: 'free',
    chat_queries: usage.chat_queries ?? 0,
    portfolio_analysis: usage.portfolio_analysis ?? 0,
    portfolio_changes: usage.portfolio_changes ?? 0,
    sec_filings: usage.sec_filings ?? 0,
    period_start: start.toISOString().replace('T', ' ').replace('.000Z', '+00'),
    period_end: endStr.replace('T', ' '),
  };
};

const createMonthlyRecord = (year: number, month: number, usage: Partial<{
  chat_queries: number;
  portfolio_analysis: number;
  portfolio_changes: number;
  sec_filings: number;
}> = {}) => {
  const start = new Date(Date.UTC(year, month - 1, 1)); // month is 0-indexed
  
  // Last day of month with microseconds
  const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const endStr = lastDay.toISOString().replace('.999Z', '.999999+00');
  
  return {
    id: `monthly-${year}-${month}`,
    user_id: 'test-user',
    tier: 'free',
    chat_queries: usage.chat_queries ?? 0,
    portfolio_analysis: usage.portfolio_analysis ?? 0,
    portfolio_changes: usage.portfolio_changes ?? 0,
    sec_filings: usage.sec_filings ?? 0,
    period_start: start.toISOString().replace('T', ' ').replace('.000Z', '+00'),
    period_end: endStr.replace('T', ' '),
  };
};

describe('Usage Tracking Periods', () => {
  describe('UTC Time Handling', () => {
    it('should calculate daily period boundaries in UTC', () => {
      // Simulate a user in CST (UTC-6) at 11pm local = 5am UTC next day
      const localTime = new Date('2025-12-03T23:00:00-06:00'); // 11pm CST
      
      // The code should use UTC, so this should be Dec 4 UTC
      const dailyStart = new Date(localTime);
      dailyStart.setUTCHours(0, 0, 0, 0);
      
      // At 11pm CST on Dec 3, it's 5am UTC on Dec 4
      expect(dailyStart.toISOString()).toBe('2025-12-04T00:00:00.000Z');
    });

    it('should calculate monthly period boundaries in UTC', () => {
      const now = new Date('2025-12-15T10:30:00Z');
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      
      expect(monthlyStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
      expect(nextMonthStart.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should handle year boundary for monthly periods', () => {
      const now = new Date('2025-12-15T10:30:00Z');
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      
      // December -> January should roll to next year
      expect(nextMonthStart.getUTCFullYear()).toBe(2026);
      expect(nextMonthStart.getUTCMonth()).toBe(0); // January
    });
  });

  describe('Daily Record Matching', () => {
    it('should match daily record for current UTC day', () => {
      const now = new Date('2025-12-03T10:30:00Z');
      const record = createDailyRecord('2025-12-03');
      
      // Simulate the query logic
      const dailyStart = new Date(now);
      dailyStart.setUTCHours(0, 0, 0, 0);
      const nextDayStart = new Date(dailyStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      
      const recordStart = new Date(record.period_start.replace(' ', 'T').replace('+00', 'Z'));
      
      // Record should match: period_start >= dailyStart AND period_start < nextDayStart
      expect(recordStart >= dailyStart).toBe(true);
      expect(recordStart < nextDayStart).toBe(true);
    });

    it('should NOT match daily record from previous day', () => {
      const now = new Date('2025-12-03T10:30:00Z');
      const record = createDailyRecord('2025-12-02'); // Yesterday
      
      const dailyStart = new Date(now);
      dailyStart.setUTCHours(0, 0, 0, 0);
      const nextDayStart = new Date(dailyStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      
      const recordStart = new Date(record.period_start.replace(' ', 'T').replace('+00', 'Z'));
      
      // Record should NOT match
      expect(recordStart >= dailyStart).toBe(false);
    });

    it('should NOT match daily record from next day', () => {
      const now = new Date('2025-12-03T10:30:00Z');
      const record = createDailyRecord('2025-12-04'); // Tomorrow
      
      const dailyStart = new Date(now);
      dailyStart.setUTCHours(0, 0, 0, 0);
      const nextDayStart = new Date(dailyStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      
      const recordStart = new Date(record.period_start.replace(' ', 'T').replace('+00', 'Z'));
      
      // Record should NOT match
      expect(recordStart < nextDayStart).toBe(false);
    });
  });

  describe('Monthly Record Matching', () => {
    it('should match monthly record for current month', () => {
      const now = new Date('2025-12-15T10:30:00Z');
      const record = createMonthlyRecord(2025, 12);
      
      // Simulate the monthly query logic
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const withinSecondOfMonthStart = new Date(monthlyStart.getTime() + 1000);
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      
      const recordStart = new Date(record.period_start.replace(' ', 'T').replace('+00', 'Z'));
      const recordEnd = new Date(record.period_end.replace(' ', 'T').replace('+00', 'Z'));
      
      // Monthly record should match all conditions:
      // 1. period_start >= monthlyStart
      expect(recordStart >= monthlyStart).toBe(true);
      // 2. period_start < withinSecondOfMonthStart (within 1 second of month start)
      expect(recordStart < withinSecondOfMonthStart).toBe(true);
      // 3. period_end >= nextMonthStart (spans into next month territory)
      expect(recordEnd >= new Date(nextMonthStart.getTime() - 1)).toBe(true); // Allow for microsecond diff
    });

    it('should NOT match daily records when querying for monthly', () => {
      const now = new Date('2025-12-15T10:30:00Z');
      const dailyRecord = createDailyRecord('2025-12-15'); // Daily record in same month
      
      // Simulate the monthly query logic
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const withinSecondOfMonthStart = new Date(monthlyStart.getTime() + 1000);
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      
      const recordStart = new Date(dailyRecord.period_start.replace(' ', 'T').replace('+00', 'Z'));
      const recordEnd = new Date(dailyRecord.period_end.replace(' ', 'T').replace('+00', 'Z'));
      
      // Daily record should FAIL at least one condition:
      // Condition 2: period_start should NOT be within 1 second of month start (it's Dec 15)
      const withinSecond = recordStart >= monthlyStart && recordStart < withinSecondOfMonthStart;
      expect(withinSecond).toBe(false);
      
      // Condition 3: period_end should NOT be >= next month (it's Dec 15 23:59:59)
      expect(recordEnd >= nextMonthStart).toBe(false);
    });

    it('should NOT match monthly record from previous month', () => {
      const now = new Date('2025-12-15T10:30:00Z');
      const record = createMonthlyRecord(2025, 11); // November
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      
      const recordStart = new Date(record.period_start.replace(' ', 'T').replace('+00', 'Z'));
      
      // November record should NOT match December query
      expect(recordStart >= monthlyStart).toBe(false);
    });
  });

  describe('Microsecond Precision Handling', () => {
    it('should handle DB microsecond precision vs JS millisecond precision', () => {
      // DB stores: 2025-12-03 23:59:59.999999+00 (microseconds)
      // JS creates: 2025-12-03T23:59:59.999Z (milliseconds)
      
      const dbEndStr = '2025-12-03 23:59:59.999999+00';
      const jsEnd = new Date('2025-12-03T23:59:59.999Z');
      
      // When JS parses the DB string, it truncates to milliseconds
      const dbEndParsed = new Date(dbEndStr.replace(' ', 'T').replace('+00', 'Z'));
      
      // They should be effectively equal (within 1ms)
      expect(Math.abs(dbEndParsed.getTime() - jsEnd.getTime())).toBeLessThan(1);
    });

    it('should use range queries to avoid exact timestamp matching issues', () => {
      // The fix uses gte/lt instead of eq to avoid precision issues
      const dailyStart = new Date('2025-12-03T00:00:00.000Z');
      const nextDayStart = new Date('2025-12-04T00:00:00.000Z');
      
      // DB record with microseconds
      const dbRecordStart = '2025-12-03 00:00:00+00';
      const recordStart = new Date(dbRecordStart.replace(' ', 'T').replace('+00', 'Z'));
      
      // Range query should work regardless of precision
      expect(recordStart >= dailyStart).toBe(true);
      expect(recordStart < nextDayStart).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight UTC correctly', () => {
      // At exactly midnight UTC
      const now = new Date('2025-12-03T00:00:00.000Z');
      
      const dailyStart = new Date(now);
      dailyStart.setUTCHours(0, 0, 0, 0);
      
      expect(dailyStart.toISOString()).toBe('2025-12-03T00:00:00.000Z');
    });

    it('should handle last second of day correctly', () => {
      // At 23:59:59 UTC
      const now = new Date('2025-12-03T23:59:59.999Z');
      
      const dailyStart = new Date(now);
      dailyStart.setUTCHours(0, 0, 0, 0);
      const nextDayStart = new Date(dailyStart);
      nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
      
      // Should still be Dec 3
      expect(dailyStart.toISOString()).toBe('2025-12-03T00:00:00.000Z');
      expect(nextDayStart.toISOString()).toBe('2025-12-04T00:00:00.000Z');
      
      // Now should be within the range
      expect(now >= dailyStart).toBe(true);
      expect(now < nextDayStart).toBe(true);
    });

    it('should handle first day of month correctly', () => {
      const now = new Date('2025-12-01T00:00:00.000Z');
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      
      expect(monthlyStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    });

    it('should handle last day of month correctly', () => {
      const now = new Date('2025-12-31T23:59:59.999Z');
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      
      expect(monthlyStart.toISOString()).toBe('2025-12-01T00:00:00.000Z');
      expect(nextMonthStart.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should handle February correctly (non-leap year)', () => {
      const now = new Date('2025-02-15T10:30:00Z');
      
      const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const lastDayOfFeb = new Date(Date.UTC(2025, 2, 0)); // Day 0 of March = last day of Feb
      
      expect(monthlyStart.toISOString()).toBe('2025-02-01T00:00:00.000Z');
      expect(lastDayOfFeb.getUTCDate()).toBe(28); // 2025 is not a leap year
    });

    it('should handle February correctly (leap year)', () => {
      const now = new Date('2024-02-15T10:30:00Z');
      
      const lastDayOfFeb = new Date(Date.UTC(2024, 2, 0)); // Day 0 of March = last day of Feb
      
      expect(lastDayOfFeb.getUTCDate()).toBe(29); // 2024 is a leap year
    });
  });

  describe('Tier Configuration Integration', () => {
    it('should have correct daily limits for all tiers', () => {
      const free = getTierConfig('free');
      const basic = getTierConfig('basic');
      const premium = getTierConfig('premium');
      
      // Free tier has limits
      expect(free.chatQueriesPerDay).toBe(20);
      expect(free.portfolioAnalysisPerDay).toBe(1);
      expect(free.portfolioChangesPerDay).toBe(3);
      
      // Basic tier has higher limits
      expect(basic.chatQueriesPerDay).toBe(100);
      expect(basic.portfolioAnalysisPerDay).toBe(10);
      expect(basic.portfolioChangesPerDay).toBe(Infinity);
      
      // Premium tier has unlimited
      expect(premium.chatQueriesPerDay).toBe(700);
      expect(premium.portfolioAnalysisPerDay).toBe(Infinity);
      expect(premium.portfolioChangesPerDay).toBe(Infinity);
    });

    it('should have correct monthly limits for SEC filings', () => {
      const free = getTierConfig('free');
      const basic = getTierConfig('basic');
      const premium = getTierConfig('premium');
      
      expect(free.secFilingsPerMonth).toBe(3);
      expect(basic.secFilingsPerMonth).toBe(Infinity);
      expect(premium.secFilingsPerMonth).toBe(Infinity);
    });
  });
});

describe('Usage Aggregation', () => {
  it('should sum usage from multiple records correctly', () => {
    const records = [
      { chat_queries: 5, portfolio_analysis: 2, sec_filings: 1, portfolio_changes: 1 },
      { chat_queries: 3, portfolio_analysis: 1, sec_filings: 0, portfolio_changes: 2 },
    ];
    
    const aggregated = records.reduce((acc, row) => ({
      chat_queries: acc.chat_queries + row.chat_queries,
      portfolio_analysis: acc.portfolio_analysis + row.portfolio_analysis,
      sec_filings: acc.sec_filings + row.sec_filings,
      portfolio_changes: acc.portfolio_changes + row.portfolio_changes,
    }), { chat_queries: 0, portfolio_analysis: 0, sec_filings: 0, portfolio_changes: 0 });
    
    expect(aggregated.chat_queries).toBe(8);
    expect(aggregated.portfolio_analysis).toBe(3);
    expect(aggregated.sec_filings).toBe(1);
    expect(aggregated.portfolio_changes).toBe(3);
  });

  it('should handle null/undefined values in aggregation', () => {
    const records: Array<{
      chat_queries: number | null;
      portfolio_analysis: number | null;
      sec_filings: number | undefined;
      portfolio_changes: number | null;
    }> = [
      { chat_queries: 5, portfolio_analysis: null, sec_filings: undefined, portfolio_changes: 1 },
    ];
    
    const initial = { chat_queries: 0, portfolio_analysis: 0, sec_filings: 0, portfolio_changes: 0 };
    const aggregated = records.reduce((acc, row) => ({
      chat_queries: (acc.chat_queries ?? 0) + (row.chat_queries ?? 0),
      portfolio_analysis: (acc.portfolio_analysis ?? 0) + (row.portfolio_analysis ?? 0),
      sec_filings: (acc.sec_filings ?? 0) + (row.sec_filings ?? 0),
      portfolio_changes: (acc.portfolio_changes ?? 0) + (row.portfolio_changes ?? 0),
    }), initial);
    
    expect(aggregated.chat_queries).toBe(5);
    expect(aggregated.portfolio_analysis).toBe(0);
    expect(aggregated.sec_filings).toBe(0);
    expect(aggregated.portfolio_changes).toBe(1);
  });
});
