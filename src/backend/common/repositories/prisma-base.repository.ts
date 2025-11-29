/**
 * Prisma Base Repository Class
 *
 * Provides generic CRUD operations using Prisma for admin operations that bypass RLS.
 * Use this for admin pages and operations that need full database access.
 */

import { PrismaClient } from '@prisma/client';
import { prisma as globalPrisma } from '@lib/prisma';
import {
  RepositoryError,
  RepositoryErrorType,
  RepositoryConfig,
} from './types';

/**
 * Prisma filter operations
 */
export interface PrismaFilter {
  field: string;
  operator: 'equals' | 'not' | 'in' | 'notIn' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

/**
 * Prisma sort options
 */
export interface PrismaSort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Prisma find options
 */
export interface PrismaFindOptions {
  filters?: PrismaFilter[];
  sort?: PrismaSort[];
  skip?: number;
  take?: number;
  select?: any;
  include?: any;
}

/**
 * Pagination result for Prisma
 */
export interface PrismaPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Abstract base repository for Prisma operations
 * T: Entity type
 * PrismaDelegate: The Prisma delegate type (e.g., prisma.user, prisma.profile)
 */
export abstract class PrismaBaseRepository<T extends Record<string, any>, PrismaDelegate = any> {
  protected prisma: PrismaClient;
  protected abstract delegate: PrismaDelegate;
  protected config: RepositoryConfig;

  constructor(config: RepositoryConfig = {}) {
    this.prisma = globalPrisma;
    this.config = {
      softDelete: false,
      timestamps: true,
      auditFields: false,
      ...config,
    };
  }

  /**
   * Build Prisma where clause from filters
   */
  protected buildWhere(filters?: PrismaFilter[]): any {
    if (!filters || filters.length === 0) return {};

    const where: any = {};

    filters.forEach(filter => {
      const { field, operator, value } = filter;

      switch (operator) {
        case 'equals':
          where[field] = value;
          break;
        case 'not':
          where[field] = { not: value };
          break;
        case 'in':
          where[field] = { in: value };
          break;
        case 'notIn':
          where[field] = { notIn: value };
          break;
        case 'lt':
          where[field] = { lt: value };
          break;
        case 'lte':
          where[field] = { lte: value };
          break;
        case 'gt':
          where[field] = { gt: value };
          break;
        case 'gte':
          where[field] = { gte: value };
          break;
        case 'contains':
          where[field] = { contains: value, mode: 'insensitive' };
          break;
        case 'startsWith':
          where[field] = { startsWith: value };
          break;
        case 'endsWith':
          where[field] = { endsWith: value };
          break;
        default:
          console.warn(`Unknown filter operator: ${operator}`);
      }
    });

    // Add soft delete filter
    if (this.config.softDelete) {
      where.deleted_at = null;
    }

    return where;
  }

  /**
   * Build Prisma orderBy from sort options
   */
  protected buildOrderBy(sort?: PrismaSort[]): any {
    if (!sort || sort.length === 0) return undefined;

    if (sort.length === 1) {
      return { [sort[0].field]: sort[0].direction };
    }

    return sort.map(s => ({ [s.field]: s.direction }));
  }

  /**
   * Find all records
   */
  async findAll(options: PrismaFindOptions = {}): Promise<T[]> {
    try {
      const { filters, sort, skip, take, select, include } = options;

      const where = this.buildWhere(filters);
      const orderBy = this.buildOrderBy(sort);

      return await (this.delegate as any).findMany({
        where,
        orderBy,
        skip,
        take,
        select,
        include,
      });
    } catch (error) {
      throw this.handleError(error, 'findAll');
    }
  }

  /**
   * Find paginated records
   */
  async findPaginated(
    page: number,
    pageSize: number,
    options: PrismaFindOptions = {}
  ): Promise<PrismaPaginatedResult<T>> {
    try {
      const { filters, sort, select, include } = options;

      const where = this.buildWhere(filters);
      const orderBy = this.buildOrderBy(sort);

      const skip = (page - 1) * pageSize;

      const [data, total] = await Promise.all([
        (this.delegate as any).findMany({
          where,
          orderBy,
          skip,
          take: pageSize,
          select,
          include,
        }),
        (this.delegate as any).count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      throw this.handleError(error, 'findPaginated');
    }
  }

  /**
   * Find single record by ID
   */
  async findById(id: string | number, options: { select?: any; include?: any } = {}): Promise<T | null> {
    try {
      return await (this.delegate as any).findUnique({
        where: { id },
        select: options.select,
        include: options.include,
      });
    } catch (error) {
      throw this.handleError(error, 'findById');
    }
  }

  /**
   * Find single record matching filters
   */
  async findOne(filters: PrismaFilter[], options: { select?: any; include?: any } = {}): Promise<T | null> {
    try {
      const where = this.buildWhere(filters);

      return await (this.delegate as any).findFirst({
        where,
        select: options.select,
        include: options.include,
      });
    } catch (error) {
      throw this.handleError(error, 'findOne');
    }
  }

  /**
   * Create a new record
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const enrichedData = this.enrichCreateData(data);

      return await (this.delegate as any).create({
        data: enrichedData,
      });
    } catch (error) {
      throw this.handleError(error, 'create');
    }
  }

  /**
   * Create multiple records
   */
  async createMany(data: Partial<T>[]): Promise<{ count: number }> {
    try {
      const enrichedData = data.map(item => this.enrichCreateData(item));

      return await (this.delegate as any).createMany({
        data: enrichedData,
      });
    } catch (error) {
      throw this.handleError(error, 'createMany');
    }
  }

  /**
   * Update record by ID
   */
  async update(id: string | number, data: Partial<T>): Promise<T> {
    try {
      const enrichedData = this.enrichUpdateData(data);

      return await (this.delegate as any).update({
        where: { id },
        data: enrichedData,
      });
    } catch (error) {
      throw this.handleError(error, 'update');
    }
  }

  /**
   * Update multiple records matching filters
   */
  async updateMany(filters: PrismaFilter[], data: Partial<T>): Promise<{ count: number }> {
    try {
      const where = this.buildWhere(filters);
      const enrichedData = this.enrichUpdateData(data);

      return await (this.delegate as any).updateMany({
        where,
        data: enrichedData,
      });
    } catch (error) {
      throw this.handleError(error, 'updateMany');
    }
  }

  /**
   * Delete record by ID
   */
  async delete(id: string | number): Promise<void> {
    try {
      if (this.config.softDelete) {
        // Soft delete: set deleted_at timestamp
        await (this.delegate as any).update({
          where: { id },
          data: { deleted_at: new Date() },
        });
      } else {
        // Hard delete
        await (this.delegate as any).delete({
          where: { id },
        });
      }
    } catch (error) {
      throw this.handleError(error, 'delete');
    }
  }

  /**
   * Delete multiple records matching filters
   */
  async deleteMany(filters: PrismaFilter[]): Promise<{ count: number }> {
    try {
      const where = this.buildWhere(filters);

      if (this.config.softDelete) {
        // Soft delete multiple
        return await (this.delegate as any).updateMany({
          where,
          data: { deleted_at: new Date() },
        });
      } else {
        // Hard delete multiple
        return await (this.delegate as any).deleteMany({
          where,
        });
      }
    } catch (error) {
      throw this.handleError(error, 'deleteMany');
    }
  }

  /**
   * Count records matching filters
   */
  async count(filters?: PrismaFilter[]): Promise<number> {
    try {
      const where = this.buildWhere(filters);

      return await (this.delegate as any).count({ where });
    } catch (error) {
      throw this.handleError(error, 'count');
    }
  }

  /**
   * Check if record exists matching filters
   */
  async exists(filters: PrismaFilter[]): Promise<boolean> {
    const count = await this.count(filters);
    return count > 0;
  }

  /**
   * Execute transaction
   */
  protected async transaction<R>(callback: (tx: any) => Promise<R>): Promise<R> {
    return this.prisma.$transaction(async (tx) => {
      return callback(tx);
    });
  }

  /**
   * Enrich create data with timestamps
   */
  protected enrichCreateData(data: Partial<T>): any {
    const enriched = { ...data };

    if (this.config.timestamps) {
      (enriched as any).created_at = new Date();
      (enriched as any).updated_at = new Date();
    }

    return enriched;
  }

  /**
   * Enrich update data with updated_at timestamp
   */
  protected enrichUpdateData(data: Partial<T>): any {
    const enriched = { ...data };

    if (this.config.timestamps) {
      (enriched as any).updated_at = new Date();
    }

    return enriched;
  }

  /**
   * Handle Prisma errors and convert to RepositoryError
   */
  protected handleError(error: any, operation: string): RepositoryError {
    console.error(`Prisma repository error in ${operation}:`, error);

    // Check for specific Prisma error codes
    if (error.code === 'P2025') {
      return new RepositoryError(
        RepositoryErrorType.NOT_FOUND,
        `Record not found in ${operation}`,
        error
      );
    }

    if (error.code === 'P2002') {
      return new RepositoryError(
        RepositoryErrorType.DUPLICATE_KEY,
        `Duplicate key violation in ${operation}`,
        error
      );
    }

    if (error.code === 'P2003') {
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
