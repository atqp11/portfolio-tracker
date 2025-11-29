/**
 * Checklist Controller
 *
 * Handles HTTP-specific logic for checklist-related requests, acting as a bridge
 * between the API routes and the ChecklistService.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checklistService } from '@backend/modules/checklist/service/checklist.service';
import { commonSchemas, createDailyChecklistSchema, updateChecklistBodySchema } from '@lib/validators/schemas';
import { NotFoundError } from '../../common/middleware/error-handler.middleware';

// Schema for GET request query parameters
const getChecklistQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
  date: z.string().datetime().optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
});

// Schema for DELETE request query parameters
const deleteChecklistQuerySchema = z.object({
  id: commonSchemas.uuid,
});

class ChecklistController {
  /**
   * Handles GET requests to retrieve checklists.
   */
  async get(request: NextRequest, { query }: { query: z.infer<typeof getChecklistQuerySchema> }) {
    try {
      const { id, portfolioId, date } = query;

      if (id) {
        const checklist = await checklistService.findChecklistById(id);
        return NextResponse.json({ success: true, data: checklist });
      }

      if (portfolioId) {
        const checklists = await checklistService.findChecklistsByPortfolio(portfolioId, date);
        return NextResponse.json({ success: true, data: checklists });
      }

      // This should not be reached due to Zod validation but acts as a safeguard.
      throw new NotFoundError('Invalid query parameters for getting checklists.');
    } catch (error: any) {
      console.error('GET /api/checklist error:', {
        message: error.message,
        stack: error.stack,
        query,
      });
      throw error;
    }
  }

  /**
   * Handles POST requests to create a new daily checklist.
   */
  async create(request: NextRequest, { body }: { body: z.infer<typeof createDailyChecklistSchema> }) {
    try {
      const newChecklist = await checklistService.createChecklist(body);
      return NextResponse.json({ success: true, data: newChecklist }, { status: 201 });
    } catch (error: any) {
      console.error('POST /api/checklist error:', {
        message: error.message,
        stack: error.stack,
        body,
      });
      throw error;
    }
  }

  /**
   * Handles PUT requests to update an existing daily checklist.
   */
  async update(request: NextRequest, { body }: { body: z.infer<typeof updateChecklistBodySchema> }) {
    try {
      const { id, ...updateData } = body;
      if (!id) {
        throw new NotFoundError('Checklist ID is required in the request body for an update.');
      }
      const updatedChecklist = await checklistService.updateChecklist(id, updateData);
      return NextResponse.json({ success: true, data: updatedChecklist });
    } catch (error: any) {
      console.error('PUT /api/checklist error:', {
        message: error.message,
        stack: error.stack,
        body,
      });
      throw error;
    }
  }

  /**
   * Handles DELETE requests to remove a daily checklist.
   */
  async delete(request: NextRequest, { query }: { query: z.infer<typeof deleteChecklistQuerySchema> }) {
    try {
      await checklistService.deleteChecklist(query.id);
      return new NextResponse(null, { status: 204 }); // 204 No Content for successful deletion
    } catch (error: any) {
      console.error('DELETE /api/checklist error:', {
        message: error.message,
        stack: error.stack,
        query,
      });
      throw error;
    }
  }
}

export const checklistController = new ChecklistController();