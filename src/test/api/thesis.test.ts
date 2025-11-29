/**
 * Investment Thesis API Integration Tests (Debug)
 */

import { POST } from '@app/api/thesis/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import { thesisRepository } from '@backend/modules/thesis/repository/thesis.repository';

// Mock the repository layer
jest.mock('@backend/modules/thesis/repository/thesis.repository', () => ({
  __esModule: true,
  thesisRepository: {
    create: jest.fn(),
  },
}));

const mockThesis = {
  id: 'c5363fb9-7513-4232-b786-82c41334f5e6',
  portfolio_id: '1b58d429-36cb-4b8f-a9ed-98c6f9ca95f4',
  ticker: 'TSLA',
  title: 'Tesla Growth Thesis',
};

describe('Thesis API POST (Debug)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return validation error for invalid portfolio_id', async () => {
    const invalidData = {
      portfolio_id: 'invalid-uuid',
      ticker: 'AMD',
      title: 'AMD Thesis',
      description: 'Test Description',
      rationale: 'Test Rationale',
    };

    const request = createMockRequest({ url: 'http://localhost:3000/api/thesis', method: 'POST', body: invalidData });
    const response = await POST(request, { body: invalidData });
    const data = await extractJSON(response);

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.details).toEqual([
      {
        field: 'portfolio_id',
        message: 'Invalid UUID format',
      },
    ]);
  });

  it('should create a new thesis successfully', async () => {
    const validData = {
      portfolio_id: 'e4713d6f-b679-45de-b675-e49ac9cf8ffa',
      ticker: 'AMD',
      title: 'AMD Thesis',
      description: 'Test Description',
      rationale: 'Test Rationale',
    };
    (thesisRepository.create as jest.Mock).mockResolvedValue({ ...mockThesis, ...validData });

    const request = createMockRequest({ url: 'http://localhost:3000/api/thesis', method: 'POST', body: validData });
    const response = await POST(request, { body: validData });
    const data = await extractJSON(response);


    expect(data.data.title).toBe(validData.title);
    expect(response.status).toBe(201);

    expect(thesisRepository.create).toHaveBeenCalledWith(expect.objectContaining(validData));
  });
});
