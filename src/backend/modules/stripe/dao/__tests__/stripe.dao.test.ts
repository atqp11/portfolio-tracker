/**
 * Stripe DAO Tests
 *
 * Tests for Stripe data access layer functions
 */

import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';
import { createAdminClient } from '@lib/supabase/admin';

jest.mock('@lib/supabase/admin');

describe('Stripe DAO', () => {
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockSingle: jest.Mock;
  let mockInsert: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockUpsert: jest.Mock;
  let mockFrom: jest.Mock;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSingle = jest.fn();
    mockEq = jest.fn().mockReturnValue({
      single: mockSingle,
    });
    mockInsert = jest.fn().mockReturnValue({ data: null, error: null });
    
    // Update returns an object with eq() method that returns a promise
    mockUpdate = jest.fn().mockReturnValue({
      eq: mockEq,
    });
    
    mockUpsert = jest.fn().mockReturnValue({ data: null, error: null });

    mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
      single: mockSingle,
    });

    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      upsert: mockUpsert,
    });

    mockSupabase = {
      from: mockFrom,
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('findTransactionByEventId', () => {
    it('should return transaction when found', async () => {
      const mockTransaction = {
        id: 'tx_1',
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        status: 'completed',
      };

      mockSingle.mockResolvedValue({
        data: mockTransaction,
        error: null,
      });

      const result = await stripeDao.findTransactionByEventId('evt_123');

      expect(result).toEqual(mockTransaction);
      expect(mockFrom).toHaveBeenCalledWith('stripe_transactions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('stripe_event_id', 'evt_123');
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should return null when transaction not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await stripeDao.findTransactionByEventId('evt_nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      });

      await expect(
        stripeDao.findTransactionByEventId('evt_123')
      ).rejects.toThrow('Failed to find transaction: Database error');
    });
  });

  describe('createTransaction', () => {
    it('should create new transaction', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        status: 'pending',
        user_id: 'user-1',
        amount_cents: 600,
        currency: 'usd',
      };

      mockInsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      // Mock findTransactionByEventId for return value
      mockSingle.mockResolvedValue({
        data: { id: 'tx_1', ...params },
        error: null,
      });

      const result = await stripeDao.createTransaction(params);

      expect(result).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith('stripe_transactions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_event_id: 'evt_123',
          event_type: 'checkout.session.completed',
          status: 'pending',
          user_id: 'user-1',
          amount_cents: 600,
          currency: 'usd',
        })
      );
    });

    it('should use default status when not provided', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'invoice.payment_succeeded',
      };

      mockInsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { id: 'tx_1', status: 'pending' },
        error: null,
      });

      await stripeDao.createTransaction(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        })
      );
    });

    it('should use default currency when not provided', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
      };

      mockInsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { id: 'tx_1' },
        error: null,
      });

      await stripeDao.createTransaction(params);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usd',
        })
      );
    });

    it('should throw error when insert fails', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
      };

      mockInsert.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      await expect(stripeDao.createTransaction(params)).rejects.toThrow(
        'Failed to create transaction: Insert failed'
      );
    });

    it('should return minimal representation if fetch fails', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
      };

      mockInsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      // Mock findTransactionByEventId to return null
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const result = await stripeDao.createTransaction(params);

      expect(result).toEqual({
        event_type: 'checkout.session.completed',
        status: 'pending',
      });
    });
  });

  describe('updateTransactionByEventId', () => {
    it('should update transaction status', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      await stripeDao.updateTransactionByEventId('evt_123', {
        status: 'completed',
        processed_at: new Date().toISOString(),
      });

      expect(mockFrom).toHaveBeenCalledWith('stripe_transactions');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processed_at: expect.any(String),
        })
      );
      expect(mockEq).toHaveBeenCalledWith('stripe_event_id', 'evt_123');
    });

    it('should update error message', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      await stripeDao.updateTransactionByEventId('evt_123', {
        status: 'failed',
        error_message: 'Processing failed',
        error_code: 'PROCESSING_ERROR',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Processing failed',
          error_code: 'PROCESSING_ERROR',
        })
      );
    });

    it('should only update provided fields', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      });

      await stripeDao.updateTransactionByEventId('evt_123', {
        status: 'completed',
      });

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall).not.toHaveProperty('error_message');
      expect(updateCall).not.toHaveProperty('processed_at');
    });

    it('should throw error when update fails', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(
        stripeDao.updateTransactionByEventId('evt_123', {
          status: 'completed',
        })
      ).rejects.toThrow('Failed to update transaction: Update failed');
    });
  });

  describe('upsertTransaction', () => {
    it('should upsert transaction with all fields', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        status: 'pending',
        user_id: 'user-1',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        amount_cents: 600,
        currency: 'usd',
        processed_at: new Date().toISOString(),
      };

      mockUpsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { id: 'tx_1', ...params },
        error: null,
      });

      const result = await stripeDao.upsertTransaction(params);

      expect(result).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith('stripe_transactions');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_event_id: 'evt_123',
          event_type: 'checkout.session.completed',
          status: 'pending',
        }),
        {
          onConflict: 'stripe_event_id',
        }
      );
    });

    it('should throw error when stripe_event_id is missing', async () => {
      const params = {
        event_type: 'checkout.session.completed',
        status: 'pending',
      };

      await expect(stripeDao.upsertTransaction(params as any)).rejects.toThrow(
        'stripe_event_id is required for upsert'
      );
    });

    it('should throw error when upsert fails', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
      };

      mockUpsert.mockResolvedValue({
        data: null,
        error: { message: 'Upsert failed' },
      });

      await expect(stripeDao.upsertTransaction(params)).rejects.toThrow(
        'Failed to upsert transaction: Upsert failed'
      );
    });

    it('should throw error when transaction cannot be retrieved after upsert', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
      };

      mockUpsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      await expect(stripeDao.upsertTransaction(params)).rejects.toThrow(
        'Failed to retrieve upserted transaction'
      );
    });

    it('should handle metadata field', async () => {
      const params = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        metadata: { retryCount: 2, source: 'webhook' },
      };

      mockUpsert.mockResolvedValue({
        data: [{ id: 'tx_1' }],
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: { id: 'tx_1', ...params },
        error: null,
      });

      await stripeDao.upsertTransaction(params);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { retryCount: 2, source: 'webhook' },
        }),
        expect.any(Object)
      );
    });
  });
});
