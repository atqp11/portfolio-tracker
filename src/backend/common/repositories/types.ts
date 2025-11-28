/**
 * Base Repository Types and Interfaces
 *
 * Defines the core types and interfaces for the repository layer,
 * providing type-safe database operations.
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Query filter operators for flexible querying
 */
export type FilterOperator =
  | 'eq'      // Equals
  | 'neq'     // Not equals
  | 'gt'      // Greater than
  | 'gte'     // Greater than or equal
  | 'lt'      // Less than
  | 'lte'     // Less than or equal
  | 'like'    // Pattern matching
  | 'ilike'   // Case-insensitive pattern matching
  | 'in'      // In array
  | 'is'      // IS (for null checks)
  | 'contains'// Array contains
  | 'containedBy' // Array contained by;

/**
 * Single filter condition
 */
export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Sorting configuration
 */
export interface QuerySort {
  field: string;
  ascending?: boolean;
}

/**
 * Pagination configuration
 */
export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Pagination metadata returned with results
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Query options for find operations
 */
export interface FindOptions {
  filters?: QueryFilter[];
  sort?: QuerySort[];
  pagination?: PaginationOptions;
  select?: string;
  relations?: string[];
}

/**
 * Repository error types
 */
export enum RepositoryErrorType {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
}

/**
 * Custom repository error class
 */
export class RepositoryError extends Error {
  constructor(
    public type: RepositoryErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Base repository interface - defines contract for all repositories
 */
export interface IRepository<T> {
  /**
   * Find all records with optional filtering, sorting, and pagination
   */
  findAll(options?: FindOptions): Promise<T[]>;

  /**
   * Find paginated records
   */
  findPaginated(options: FindOptions & { pagination: PaginationOptions }): Promise<PaginatedResult<T>>;

  /**
   * Find a single record by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find a single record matching conditions
   */
  findOne(filters: QueryFilter[]): Promise<T | null>;

  /**
   * Create a new record
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Create multiple records
   */
  createMany(data: Partial<T>[]): Promise<T[]>;

  /**
   * Update a record by ID
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Update multiple records matching conditions
   */
  updateMany(filters: QueryFilter[], data: Partial<T>): Promise<number>;

  /**
   * Delete a record by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple records matching conditions
   */
  deleteMany(filters: QueryFilter[]): Promise<number>;

  /**
   * Count records matching conditions
   */
  count(filters?: QueryFilter[]): Promise<number>;

  /**
   * Check if record exists
   */
  exists(filters: QueryFilter[]): Promise<boolean>;
}

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (client: SupabaseClient) => Promise<T>;

/**
 * Repository configuration options
 */
export interface RepositoryConfig {
  softDelete?: boolean;          // Enable soft delete (deleted_at field)
  timestamps?: boolean;           // Auto-manage created_at/updated_at
  auditFields?: boolean;          // Track created_by/updated_by
}
