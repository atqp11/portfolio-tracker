'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@lib/auth/session';
import { thesisService } from '@backend/modules/thesis/service/thesis.service';
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';
import { CreateThesisInput, UpdateThesisInput } from '@lib/validators/schemas';

/**
 * Helper to format Zod validation errors into user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    const firstError = error.issues[0];
    const field = firstError.path.length > 0 ? firstError.path.join('.') : '';
    return field ? `${field}: ${firstError.message}` : firstError.message;
  }
  return 'Validation failed';
}

// Schema for fetching theses by portfolio type
const fetchThesesSchema = z.object({
  portfolioType: z.enum(['energy', 'copper']),
});

/**
 * Server Action to fetch theses for a portfolio type
 * This is a read operation that calls the service layer
 */
export async function fetchThesesForPortfolio(portfolioType: 'energy' | 'copper') {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Validate input
    const result = fetchThesesSchema.safeParse({ portfolioType });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // 3. Fetch portfolio via service (returns DTO)
    const portfolios = await portfolioService.findAll();
    const portfolio = portfolios.find((p: any) => p.type === portfolioType);

    if (!portfolio) {
      return [];
    }

    // 4. Fetch theses via service (returns DTOs)
    const theses = await thesisService.findByPortfolioId(portfolio.id);

    return Array.isArray(theses) ? theses : [];
  } catch (error) {
    console.error(`Error fetching theses for ${portfolioType}:`, error);
    return [];
  }
}

/**
 * Server Action to fetch portfolio data for a portfolio type
 * Used to calculate thesis metrics
 */
export async function fetchPortfolioData(portfolioType: 'energy' | 'copper') {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Fetch portfolio via service
    const portfolios = await portfolioService.findAll();
    const portfolio = portfolios.find((p: any) => p.type === portfolioType);

    if (!portfolio) {
      return null;
    }

    return portfolio;
  } catch (error) {
    console.error(`Error fetching portfolio data for ${portfolioType}:`, error);
    return null;
  }
}

/**
 * Server Action to create a new thesis
 */
export async function createThesis(data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Create via service (handles validation and DTO transformation)
    const newThesis = await thesisService.create(data as CreateThesisInput);

    // 3. Revalidate path
    revalidatePath('/thesis');

    return { success: true, data: newThesis };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create thesis');
  }
}

/**
 * Server Action to update a thesis
 */
export async function updateThesis(thesisId: string, data: unknown) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Update via service (handles validation and DTO transformation)
    const updatedThesis = await thesisService.update(thesisId, data as UpdateThesisInput);

    // 3. Revalidate path
    revalidatePath('/thesis');

    return { success: true, data: updatedThesis };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update thesis');
  }
}

/**
 * Server Action to delete a thesis
 */
export async function deleteThesis(thesisId: string) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Delete via service
    await thesisService.delete(thesisId);

    // 3. Revalidate path
    revalidatePath('/thesis');

    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to delete thesis');
  }
}

/**
 * Server Action to validate a thesis
 */
export async function validateThesis(thesisId: string) {
  try {
    // 1. Auth check
    await requireUser();

    // 2. Fetch thesis via service
    const thesis = await thesisService.findById(thesisId);

    // 3. Perform validation logic
    const errors = [];

    if (!thesis.title || !thesis.description || !thesis.rationale) {
      errors.push('Missing required fields');
    }

    if (!thesis.exitCriteria || !thesis.exitCriteria.targetValue) {
      errors.push('Exit criteria missing');
    }

    // Check key metrics
    const keyMetrics = thesis.keyMetrics || [];
    for (const metric of keyMetrics) {
      if (metric.urgency === 'red') {
        errors.push(`${metric.name}: ${metric.condition || 'Critical threshold reached'}`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to validate thesis');
  }
}
