/**
 * Thesis Controller
 *
 * This controller is responsible for handling HTTP-specific logic for thesis-related requests.
 * It acts as a bridge between the API routes and the business logic in the ThesisService.
 * Its main responsibilities are:
 * - Parsing and validating incoming request data (delegated to middleware).
 * - Calling the appropriate service methods.
 * - Formatting the service response into a standard NextResponse.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { thesisService } from '@backend/modules/thesis/service/thesis.service';
import { commonSchemas, createThesisSchema, updateThesisBodySchema } from '@lib/validators/schemas';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Define the query schema here as it's specific to the controller's GET method
const getThesisQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
  path: ['id', 'portfolioId'],
}).refine(data => !(data.id && data.portfolioId), {
  message: 'Cannot provide both id and portfolioId.',
  path: ['id', 'portfolioId'],
});

const deleteThesisQuerySchema = z.object({
  id: commonSchemas.uuid,
});


class ThesisController {
  /**
   * Handles GET requests to retrieve one or more investment theses.
   */
  async get(request: NextRequest, { query }: { query: z.infer<typeof getThesisQuerySchema> }) {
    if (query.id) {
      const thesis = await thesisService.findById(query.id);
      return NextResponse.json({ success: true, data: thesis });
    } else if (query.portfolioId) {
      const theses = await thesisService.findByPortfolioId(query.portfolioId);
      return NextResponse.json({ success: true, data: theses });
    }
    // This path should not be reached due to Zod validation, but provides a safeguard.
    throw new NotFoundError('Invalid query parameters provided.');
  }

  /**
   * Handles POST requests to create a new investment thesis.
   */
  async create(request: NextRequest, { body }: { body: z.infer<typeof createThesisSchema> }) {
    const newThesis = await thesisService.create(body);
    return NextResponse.json({ success: true, data: newThesis }, { status: 201 });
  }

  /**
   * Handles PUT requests to update an existing investment thesis.
   */
  async update(request: NextRequest, { body }: { body: z.infer<typeof updateThesisBodySchema> }) {
    // Note: Following the existing pattern of ID in the body.
    const { id, ...updateData } = body;
    if (!id) {
      throw new NotFoundError('Thesis ID is required in the request body for an update.');
    }
    const updatedThesis = await thesisService.update(id, updateData);
    return NextResponse.json({ success: true, data: updatedThesis });
  }

  /**
   * Handles DELETE requests to remove an investment thesis.
   */
  async delete(request: NextRequest, { query }: { query: z.infer<typeof deleteThesisQuerySchema> }) {
    await thesisService.delete(query.id);
    return new NextResponse(null, { status: 204 }); // 204 No Content is standard for successful deletion
  }
}

export const thesisController = new ThesisController();