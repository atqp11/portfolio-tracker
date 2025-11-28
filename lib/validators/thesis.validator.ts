/**
 * Investment Thesis Validator
 *
 * Uses Zod schemas to validate thesis input data. This approach centralizes
 * validation logic and allows for easy reuse. It throws a specific
 * ValidationError that can be caught by the centralized error handler middleware.
 */

import { createThesisSchema, updateThesisSchema, CreateThesisInput, UpdateThesisInput, formatZodError } from '@/lib/validators/schemas';
import { ValidationError } from '@/server/middleware/validation.middleware';

export class ThesisValidator {
  /**
   * Validates the data for creating a new investment thesis.
   * @param data - The input data for creating a thesis. It is of type `unknown` to ensure it's validated before use.
   * @throws {ValidationError} if the data is invalid, providing structured error details.
   */
  public validateCreate(data: unknown): asserts data is CreateThesisInput {
    const result = createThesisSchema.safeParse(data);
    if (!result.success) {
      // The formatZodError function provides a consistent error structure.
      throw new ValidationError('Invalid thesis creation data.', formatZodError(result.error).errors);
    }
  }

  /**
   * Validates the data for updating an existing investment thesis.
   * @param data - The input data for updating a thesis.
   * @throws {ValidationError} if the data is invalid.
   */
  public validateUpdate(data: unknown): asserts data is UpdateThesisInput {
    const result = updateThesisSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Invalid thesis update data.', formatZodError(result.error).errors);
    }
  }
}

export const thesisValidator = new ThesisValidator();
