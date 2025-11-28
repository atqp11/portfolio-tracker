import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stockService } from '@/lib/services/stock.service';
import { createStockSchema, updateStockSchema, commonSchemas } from '@/lib/validators/schemas';
import { NotFoundError } from '@/lib/middleware/error-handler.middleware';

// Schema for GET request query parameters
const getStockQuerySchema = z.object({
  id: commonSchemas.uuid.optional(),
  portfolioId: commonSchemas.uuid.optional(),
}).refine(data => data.id || data.portfolioId, {
  message: 'Either id or portfolioId must be provided.',
});

// Schema for DELETE request query parameters
const deleteStockQuerySchema = z.object({
  id: commonSchemas.uuid,
});

class StockController {
  async get(request: NextRequest, { query }: { query: z.infer<typeof getStockQuerySchema> }) {
    if (query.id) {
      const stock = await stockService.findById(query.id);
      return NextResponse.json({ success: true, data: stock });
    } else if (query.portfolioId) {
      const stocks = await stockService.findByPortfolioId(query.portfolioId);
      return NextResponse.json({ success: true, data: stocks });
    }
    throw new NotFoundError('Invalid query parameters for getting stocks.');
  }

  async create(request: NextRequest, { body }: { body: z.infer<typeof createStockSchema> }) {
    const newStock = await stockService.create(body);
    return NextResponse.json({ success: true, data: newStock }, { status: 201 });
  }

  async update(request: NextRequest, { body }: { body: z.infer<typeof updateStockSchema> & { id: string } }) {
    const { id, ...updateData } = body;
    if (!id) {
      throw new NotFoundError('Stock ID is required in the request body for an update.');
    }
    const updatedStock = await stockService.update(id, updateData);
    return NextResponse.json({ success: true, data: updatedStock });
  }

  async delete(request: NextRequest, { query }: { query: z.infer<typeof deleteStockQuerySchema> }) {
    await stockService.delete(query.id);
    return new NextResponse(null, { status: 204 });
  }
}

export const stockController = new StockController();
