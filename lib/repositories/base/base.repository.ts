/**
 * Base Repository Class
 *
 * Provides generic CRUD operations and query building for all repositories.
 * Extends from this class to create entity-specific repositories.
 *
 * Pattern inspired by existing lib/dao/base.dao.ts for external APIs
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  IRepository,
  QueryFilter,
  QuerySort,
  FindOptions,
  PaginationOptions,
  PaginatedResult,
  PaginationMeta,
  RepositoryError,
  RepositoryErrorType,
  RepositoryConfig,
  TransactionCallback,
} from './types';

/**
 * Abstract base repository implementing common database operations
 */
export abstract class BaseRepository<T extends Record<string, any>> implements IRepository<T> {
  protected abstract tableName: string;
  protected config: RepositoryConfig;
  protected supabase: SupabaseClient;

  private supabasePromise: Promise<SupabaseClient>;

  constructor(config: RepositoryConfig = {}) {
    this.config = {
      softDelete: false,
      timestamps: true,
      auditFields: false,
      ...config,
    };
    // Initialize supabase as a promise
    this.supabasePromise = createServerClient();
    // Set a placeholder that will be replaced on first use
    this.supabase = null as any;
  }

  /**
   * Ensure supabase client is initialized
   */
  protected async ensureClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await this.supabasePromise;
    }
    return this.supabase;
  }

  /**
   * Find all records with optional filtering, sorting
   */
  async findAll(options: FindOptions = {}): Promise<T[]> {
    const query = this.buildQuery(options);
    return this.executeQuery(query, `${this.tableName}.findAll`);
  }

  /**
   * Find paginated records
   */
  async findPaginated(options: FindOptions & { pagination: PaginationOptions }): Promise<PaginatedResult<T>> {
    const { pagination } = options;
    const { page, limit } = pagination;

    // Calculate offset
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Get total count
    const total = await this.count(options.filters);

    // Build and execute query with pagination
    let query = this.buildQuery(options);
    query = query.range(from, to);

    const data = await this.executeQuery(query, `${this.tableName}.findPaginated`);

    // Calculate pagination meta
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data, meta };
  }

  /**
   * Find single record by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id);

    const results = await this.executeQuery(query, `${this.tableName}.findById`);
    return results[0] || null;
  }

  /**
   * Find single record matching filters
   */
  async findOne(filters: QueryFilter[]): Promise<T | null> {
    const query = this.buildQuery({ filters });
    const results = await this.executeQuery(query, `${this.tableName}.findOne`);
    return results[0] || null;
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    const enrichedData = this.enrichCreateData(data);

    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .insert(enrichedData)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, `${this.tableName}.create`);
    }

    return result as T;
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const enrichedData = data.map(item => this.enrichCreateData(item));

    const { data: results, error } = await this.supabase
      .from(this.tableName)
      .insert(enrichedData)
      .select();

    if (error) {
      throw this.handleError(error, `${this.tableName}.createMany`);
    }

    return results as T[];
  }

  /**
   * Update record by ID
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    const enrichedData = this.enrichUpdateData(data);

    const { data: result, error } = await this.supabase
      .from(this.tableName)
      .update(enrichedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new RepositoryError(
          RepositoryErrorType.NOT_FOUND,
          `Record with id ${id} not found in ${this.tableName}`,
          error
        );
      }
      throw this.handleError(error, `${this.tableName}.update`);
    }

    return result as T;
  }

  /**
   * Update multiple records matching filters
   */
  async updateMany(filters: QueryFilter[], data: Partial<T>): Promise<number> {
    const enrichedData = this.enrichUpdateData(data);

    let query = this.supabase
      .from(this.tableName)
      .update(enrichedData);

    // Apply filters
    query = this.applyFilters(query, filters);

    const { data: results, error } = await query.select();

    if (error) {
      throw this.handleError(error, `${this.tableName}.updateMany`);
    }

    return results?.length || 0;
  }

  /**
   * Delete record by ID
   */
  async delete(id: string): Promise<void> {
    if (this.config.softDelete) {
      // Soft delete: set deleted_at timestamp
      await this.update(id, { deleted_at: new Date().toISOString() } as any);
    } else {
      // Hard delete
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        throw this.handleError(error, `${this.tableName}.delete`);
      }
    }
  }

  /**
   * Delete multiple records matching filters
   */
  async deleteMany(filters: QueryFilter[]): Promise<number> {
    if (this.config.softDelete) {
      // Soft delete multiple
      return this.updateMany(filters, { deleted_at: new Date().toISOString() } as any);
    } else {
      // Hard delete multiple
      let query = this.supabase
        .from(this.tableName)
        .delete();

      query = this.applyFilters(query, filters);

      const { data: results, error } = await query.select();

      if (error) {
        throw this.handleError(error, `${this.tableName}.deleteMany`);
      }

      return results?.length || 0;
    }
  }

  /**
   * Count records matching filters
   */
  async count(filters?: QueryFilter[]): Promise<number> {
    let query = this.supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    if (filters && filters.length > 0) {
      query = this.applyFilters(query, filters);
    }

    if (this.config.softDelete) {
      query = query.is('deleted_at', null);
    }

    const { count, error } = await query;

    if (error) {
      throw this.handleError(error, `${this.tableName}.count`);
    }

    return count || 0;
  }

  /**
   * Check if record exists matching filters
   */
  async exists(filters: QueryFilter[]): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  /**
   * Execute transaction
   */
  protected async transaction<R>(callback: TransactionCallback<R>): Promise<R> {
    // Note: Supabase doesn't have native transaction support like Prisma
    // This is a placeholder for future implementation with Prisma transactions
    // For now, just execute the callback with the same client
    return callback(this.supabase);
  }

  /**
   * Build query with filters, sorting, and selection
   */
  protected buildQuery(options: FindOptions = {}): any {
    const { filters, sort, select, relations } = options;

    // Start with select
    let selectClause = select || '*';
    if (relations && relations.length > 0) {
      selectClause = `*, ${relations.join(', ')}`;
    }

    let query = this.supabase
      .from(this.tableName)
      .select(selectClause);

    // Apply soft delete filter
    if (this.config.softDelete) {
      query = query.is('deleted_at', null);
    }

    // Apply filters
    if (filters && filters.length > 0) {
      query = this.applyFilters(query, filters);
    }

    // Apply sorting
    if (sort && sort.length > 0) {
      sort.forEach(s => {
        query = query.order(s.field, { ascending: s.ascending !== false });
      });
    }

    return query;
  }

  /**
   * Apply filters to query
   */
  protected applyFilters(query: any, filters: QueryFilter[]): any {
    filters.forEach(filter => {
      const { field, operator, value } = filter;

      switch (operator) {
        case 'eq':
          query = query.eq(field, value);
          break;
        case 'neq':
          query = query.neq(field, value);
          break;
        case 'gt':
          query = query.gt(field, value);
          break;
        case 'gte':
          query = query.gte(field, value);
          break;
        case 'lt':
          query = query.lt(field, value);
          break;
        case 'lte':
          query = query.lte(field, value);
          break;
        case 'like':
          query = query.like(field, value);
          break;
        case 'ilike':
          query = query.ilike(field, value);
          break;
        case 'in':
          query = query.in(field, value);
          break;
        case 'is':
          query = query.is(field, value);
          break;
        case 'contains':
          query = query.contains(field, value);
          break;
        case 'containedBy':
          query = query.containedBy(field, value);
          break;
        default:
          console.warn(`Unknown filter operator: ${operator}`);
      }
    });

    return query;
  }

  /**
   * Execute query and handle errors
   */
  protected async executeQuery(query: any, operation: string): Promise<T[]> {
    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, operation);
    }

    return (data || []) as T[];
  }

  /**
   * Enrich create data with timestamps and audit fields
   */
  protected enrichCreateData(data: Partial<T>): Partial<T> {
    const enriched = { ...data };

    if (this.config.timestamps) {
      const now = new Date().toISOString();
      (enriched as any).created_at = now;
      (enriched as any).updated_at = now;
    }

    return enriched;
  }

  /**
   * Enrich update data with updated_at timestamp
   */
  protected enrichUpdateData(data: Partial<T>): Partial<T> {
    const enriched = { ...data };

    if (this.config.timestamps) {
      (enriched as any).updated_at = new Date().toISOString();
    }

    return enriched;
  }

  /**
   * Handle database errors and convert to RepositoryError
   */
  protected handleError(error: any, operation: string): RepositoryError {
    console.error(`Repository error in ${operation}:`, error);

    // Check for specific error types
    if (error.code === 'PGRST116') {
      return new RepositoryError(
        RepositoryErrorType.NOT_FOUND,
        `Record not found in ${operation}`,
        error
      );
    }

    if (error.code === '23505') {
      return new RepositoryError(
        RepositoryErrorType.DUPLICATE_KEY,
        `Duplicate key violation in ${operation}`,
        error
      );
    }

    if (error.code === '23503') {
      return new RepositoryError(
        RepositoryErrorType.VALIDATION_ERROR,
        `Foreign key constraint violation in ${operation}`,
        error
      );
    }

    return new RepositoryError(
      RepositoryErrorType.DATABASE_ERROR,
      `Database error in ${operation}: ${error.message}`,
      error
    );
  }
}
