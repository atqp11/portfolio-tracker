/**
 * Base Transformer Utilities
 *
 * Provides utility functions for transforming data between layers:
 * - Database models → API responses (snake_case → camelCase)
 * - API requests → Database models (camelCase → snake_case)
 * - Field filtering and mapping
 */

/**
 * Case conversion utilities
 */
export class CaseConverter {
  /**
   * Convert snake_case to camelCase
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert camelCase to snake_case
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert object keys from snake_case to camelCase
   */
  static objectSnakeToCamel<T = any>(obj: Record<string, any>): T {
    if (obj === null || obj === undefined) {
      return obj as any;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.objectSnakeToCamel(item)) as any;
    }

    if (typeof obj !== 'object') {
      return obj as any;
    }

    const result: Record<string, any> = {};

    Object.keys(obj).forEach(key => {
      const camelKey = this.snakeToCamel(key);
      const value = obj[key];

      // Recursively convert nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[camelKey] = this.objectSnakeToCamel(value);
      } else if (Array.isArray(value)) {
        result[camelKey] = value.map(item =>
          typeof item === 'object' ? this.objectSnakeToCamel(item) : item
        );
      } else {
        result[camelKey] = value;
      }
    });

    return result as T;
  }

  /**
   * Convert object keys from camelCase to snake_case
   */
  static objectCamelToSnake<T = any>(obj: Record<string, any>): T {
    if (obj === null || obj === undefined) {
      return obj as any;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.objectCamelToSnake(item)) as any;
    }

    if (typeof obj !== 'object') {
      return obj as any;
    }

    const result: Record<string, any> = {};

    Object.keys(obj).forEach(key => {
      const snakeKey = this.camelToSnake(key);
      const value = obj[key];

      // Recursively convert nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        result[snakeKey] = this.objectCamelToSnake(value);
      } else if (Array.isArray(value)) {
        result[snakeKey] = value.map(item =>
          typeof item === 'object' ? this.objectCamelToSnake(item) : item
        );
      } else {
        result[snakeKey] = value;
      }
    });

    return result as T;
  }
}

/**
 * Field filtering and mapping utilities
 */
export class FieldMapper {
  /**
   * Pick specific fields from object
   */
  static pick<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    fields: K[]
  ): Pick<T, K> {
    const result: any = {};
    fields.forEach(field => {
      if (field in obj) {
        result[field] = obj[field];
      }
    });
    return result;
  }

  /**
   * Omit specific fields from object
   */
  static omit<T extends Record<string, any>, K extends keyof T>(
    obj: T,
    fields: K[]
  ): Omit<T, K> {
    const result: any = { ...obj };
    fields.forEach(field => {
      delete result[field];
    });
    return result;
  }

  /**
   * Rename fields in object
   */
  static rename<T extends Record<string, any>>(
    obj: T,
    mapping: Record<string, string>
  ): Record<string, any> {
    const result: Record<string, any> = { ...obj };

    Object.entries(mapping).forEach(([oldKey, newKey]) => {
      if (oldKey in result) {
        result[newKey] = result[oldKey];
        delete result[oldKey];
      }
    });

    return result;
  }

  /**
   * Map object using custom mapping function
   */
  static map<T extends Record<string, any>, R>(
    obj: T,
    mapper: (key: string, value: any) => [string, any] | null
  ): R {
    const result: Record<string, any> = {};

    Object.entries(obj).forEach(([key, value]) => {
      const mapped = mapper(key, value);
      if (mapped) {
        const [newKey, newValue] = mapped;
        result[newKey] = newValue;
      }
    });

    return result as R;
  }
}

/**
 * Date transformation utilities
 */
export class DateTransformer {
  /**
   * Convert ISO string to Date object
   */
  static toDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    return new Date(value);
  }

  /**
   * Convert Date object to ISO string
   */
  static toISOString(value: Date | null | undefined): string | null {
    if (!value) return null;
    return value.toISOString();
  }

  /**
   * Convert Date object to Unix timestamp (seconds)
   */
  static toUnixTimestamp(value: Date | null | undefined): number | null {
    if (!value) return null;
    return Math.floor(value.getTime() / 1000);
  }

  /**
   * Convert Unix timestamp to Date object
   */
  static fromUnixTimestamp(timestamp: number | null | undefined): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp * 1000);
  }

  /**
   * Transform all date fields in object
   */
  static transformDates<T extends Record<string, any>>(
    obj: T,
    dateFields: string[],
    transform: (date: any) => any
  ): T {
    const result: any = { ...obj };

    dateFields.forEach(field => {
      if (field in result) {
        result[field] = transform(result[field]);
      }
    });

    return result;
  }
}

/**
 * Base transformer class
 */
export abstract class BaseTransformer<Entity, Response = any> {
  /**
   * Transform entity to response format
   */
  abstract toResponse(entity: Entity): Response;

  /**
   * Transform multiple entities to response format
   */
  toResponseArray(entities: Entity[]): Response[] {
    return entities.map(entity => this.toResponse(entity));
  }

  /**
   * Transform request data to entity format
   */
  fromRequest(data: any): Partial<Entity> {
    // Default implementation: convert camelCase to snake_case
    return CaseConverter.objectCamelToSnake(data);
  }

  /**
   * Transform entity for create operation
   */
  forCreate(data: any): Partial<Entity> {
    return this.fromRequest(data);
  }

  /**
   * Transform entity for update operation
   */
  forUpdate(data: any): Partial<Entity> {
    return this.fromRequest(data);
  }
}

/**
 * Generic transformer for simple entities
 */
export class GenericTransformer<Entity extends Record<string, any>> extends BaseTransformer<Entity> {
  constructor(
    private options: {
      omitFields?: (keyof Entity)[];
      pickFields?: (keyof Entity)[];
      renameFields?: Record<string, string>;
      dateFields?: string[];
      convertCase?: boolean;
    } = {}
  ) {
    super();
  }

  toResponse(entity: Entity): any {
    let result: any = { ...entity };

    // Pick specific fields
    if (this.options.pickFields) {
      result = FieldMapper.pick(result, this.options.pickFields);
    }

    // Omit specific fields
    if (this.options.omitFields) {
      result = FieldMapper.omit(result, this.options.omitFields);
    }

    // Rename fields
    if (this.options.renameFields) {
      result = FieldMapper.rename(result, this.options.renameFields);
    }

    // Transform dates
    if (this.options.dateFields) {
      result = DateTransformer.transformDates(
        result,
        this.options.dateFields,
        DateTransformer.toISOString
      );
    }

    // Convert case
    if (this.options.convertCase !== false) {
      result = CaseConverter.objectSnakeToCamel(result);
    }

    return result;
  }
}

/**
 * Transformer factory
 */
export class TransformerFactory {
  private static transformers: Map<string, BaseTransformer<any>> = new Map();

  /**
   * Register a transformer
   */
  static register<E, R>(name: string, transformer: BaseTransformer<E, R>): void {
    this.transformers.set(name, transformer);
  }

  /**
   * Get a registered transformer
   */
  static get<E, R>(name: string): BaseTransformer<E, R> {
    const transformer = this.transformers.get(name);
    if (!transformer) {
      throw new Error(`Transformer ${name} not registered`);
    }
    return transformer as BaseTransformer<E, R>;
  }

  /**
   * Check if transformer is registered
   */
  static has(name: string): boolean {
    return this.transformers.has(name);
  }

  /**
   * Clear all registered transformers (useful for testing)
   */
  static clear(): void {
    this.transformers.clear();
  }
}

/**
 * Common transformations
 */
export class CommonTransformations {
  /**
   * Remove sensitive fields from object
   */
  static removeSensitiveFields<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'api_key']
  ): Partial<T> {
    return FieldMapper.omit(obj, sensitiveFields as (keyof T)[]) as Partial<T>;
  }

  /**
   * Add computed fields to object
   */
  static addComputedFields<T extends Record<string, any>>(
    obj: T,
    computedFields: Record<string, (obj: T) => any>
  ): T & Record<string, any> {
    const result: any = { ...obj };

    Object.entries(computedFields).forEach(([field, compute]) => {
      result[field] = compute(obj);
    });

    return result;
  }

  /**
   * Format monetary amount (add currency symbol, decimal places)
   */
  static formatMoney(amount: number, currency: string = 'USD', decimals: number = 2): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }
}
