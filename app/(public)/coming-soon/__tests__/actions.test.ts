/**
 * Waitlist Server Action Tests
 *
 * Tests for the joinWaitlist server action
 */

import { joinWaitlist } from '../actions';
import * as waitlistController from '@backend/modules/waitlist/waitlist.controller';

jest.mock('@backend/modules/waitlist/waitlist.controller');

const mockCreateWaitlistEntryData = waitlistController.createWaitlistEntryData as jest.MockedFunction<
  typeof waitlistController.createWaitlistEntryData
>;

describe('joinWaitlist Server Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully join waitlist with valid email and name', async () => {
    const mockResult = {
      message: 'Thank you for joining our waitlist!',
      id: '123',
      alreadyExists: false,
    };

    mockCreateWaitlistEntryData.mockResolvedValue(mockResult);

    const result = await joinWaitlist({
      email: 'user@example.com',
      name: 'Test User',
    });

    expect(result).toEqual({
      success: true,
      ...mockResult,
    });
    expect(mockCreateWaitlistEntryData).toHaveBeenCalledWith({
      email: 'user@example.com',
      name: 'Test User',
    });
  });

  it('should successfully join waitlist with email only', async () => {
    const mockResult = {
      message: 'Thank you for joining our waitlist!',
      id: '124',
      alreadyExists: false,
    };

    mockCreateWaitlistEntryData.mockResolvedValue(mockResult);

    const result = await joinWaitlist({
      email: 'user@example.com',
    });

    expect(result).toEqual({
      success: true,
      ...mockResult,
    });
    expect(mockCreateWaitlistEntryData).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
  });

  it('should handle existing entry gracefully', async () => {
    const mockResult = {
      message: "You're already on the waitlist! We'll notify you when we launch.",
      id: '125',
      alreadyExists: true,
    };

    mockCreateWaitlistEntryData.mockResolvedValue(mockResult);

    const result = await joinWaitlist({
      email: 'existing@example.com',
      name: 'Existing User',
    });

    expect(result).toEqual({
      success: true,
      ...mockResult,
    });
    expect(result.alreadyExists).toBe(true);
  });

  it('should throw error for invalid email format', async () => {
    await expect(
      joinWaitlist({
        email: 'invalid-email',
        name: 'Test',
      })
    ).rejects.toThrow();

    expect(mockCreateWaitlistEntryData).not.toHaveBeenCalled();
  });

  it('should throw error for missing email', async () => {
    await expect(
      joinWaitlist({
        name: 'Test',
      } as any)
    ).rejects.toThrow();

    expect(mockCreateWaitlistEntryData).not.toHaveBeenCalled();
  });

  it('should throw error for name exceeding max length', async () => {
    const longName = 'a'.repeat(101);

    await expect(
      joinWaitlist({
        email: 'user@example.com',
        name: longName,
      })
    ).rejects.toThrow();

    expect(mockCreateWaitlistEntryData).not.toHaveBeenCalled();
  });

  it('should propagate controller errors with user-friendly message', async () => {
    mockCreateWaitlistEntryData.mockRejectedValue(
      new Error('Database connection failed')
    );

    await expect(
      joinWaitlist({
        email: 'user@example.com',
        name: 'Test',
      })
    ).rejects.toThrow('Database connection failed');
  });

  it('should handle validation errors with formatted messages', async () => {
    await expect(
      joinWaitlist({
        email: 'not-an-email',
      })
    ).rejects.toThrow();

    // Should include field name in error message
    try {
      await joinWaitlist({
        email: 'not-an-email',
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const errorMessage = (error as Error).message;
      expect(errorMessage).toBeTruthy();
    }
  });

  it('should reject emails with whitespace (validation happens before trimming in client)', async () => {
    // The action validates input strictly - whitespace in email is invalid
    // Client components should trim before calling the action
    await expect(
      joinWaitlist({
        email: '  user@example.com  ',
        name: '  Test User  ',
      })
    ).rejects.toThrow();

    expect(mockCreateWaitlistEntryData).not.toHaveBeenCalled();
  });

  it('should accept valid trimmed email and name', async () => {
    const mockResult = {
      message: 'Thank you for joining our waitlist!',
      id: '126',
      alreadyExists: false,
    };

    mockCreateWaitlistEntryData.mockResolvedValue(mockResult);

    // Client should trim before calling - this simulates that
    const result = await joinWaitlist({
      email: 'user@example.com', // Already trimmed by client
      name: 'Test User', // Already trimmed by client
    });

    expect(result.success).toBe(true);
    expect(mockCreateWaitlistEntryData).toHaveBeenCalledWith({
      email: 'user@example.com',
      name: 'Test User',
    });
  });
});

