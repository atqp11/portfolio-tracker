/**
 * Pagination DTOs
 *
 * Provides reusable pagination request and response structures
 */

import { PaginationMeta, PaginationOptions } from '@backend/common/repositories/types';

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Pagination request parameters
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
}

/**
 * Parse and validate pagination parameters from request
 */
export class PaginationDTO {
  /**
   * Parse pagination from query parameters
   */
  static fromQuery(params: URLSearchParams | Record<string, any>): PaginationOptions {
    let page = DEFAULT_PAGE;
    let limit = DEFAULT_LIMIT;

    if (params instanceof URLSearchParams) {
      const pageParam = params.get('page');
      const limitParam = params.get('limit');

      if (pageParam) {
        page = parseInt(pageParam, 10);
      }
      if (limitParam) {
        limit = parseInt(limitParam, 10);
      }
    } else {
      if (params.page) {
        page = parseInt(String(params.page), 10);
      }
      if (params.limit) {
        limit = parseInt(String(params.limit), 10);
      }
    }

    // Validate and sanitize
    return this.validate({ page, limit });
  }

  /**
   * Validate and sanitize pagination options
   */
  static validate(options: PaginationRequest): PaginationOptions {
    let { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;

    // Ensure page is at least 1
    page = Math.max(1, Math.floor(page));

    // Ensure limit is between 1 and MAX_LIMIT
    limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));

    return { page, limit };
  }

  /**
   * Create pagination options from request
   */
  static create(page?: number, limit?: number): PaginationOptions {
    return this.validate({ page, limit });
  }
}

/**
 * Pagination response builder
 */
export class PaginationMetaBuilder {
  /**
   * Build pagination metadata
   */
  static build(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Build empty pagination (no results)
   */
  static empty(page: number = 1, limit: number = DEFAULT_LIMIT): PaginationMeta {
    return {
      page,
      limit,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    };
  }
}

/**
 * Pagination link generator (for HATEOAS-style pagination)
 */
export class PaginationLinks {
  /**
   * Generate pagination links
   */
  static generate(
    baseUrl: string,
    meta: PaginationMeta,
    additionalParams?: Record<string, string>
  ): {
    first: string;
    last: string;
    next?: string;
    prev?: string;
    self: string;
  } {
    const params = new URLSearchParams(additionalParams);

    const buildUrl = (page: number) => {
      const urlParams = new URLSearchParams(params);
      urlParams.set('page', String(page));
      urlParams.set('limit', String(meta.limit));
      return `${baseUrl}?${urlParams.toString()}`;
    };

    const links: any = {
      first: buildUrl(1),
      last: buildUrl(meta.totalPages),
      self: buildUrl(meta.page),
    };

    if (meta.hasNext) {
      links.next = buildUrl(meta.page + 1);
    }

    if (meta.hasPrev) {
      links.prev = buildUrl(meta.page - 1);
    }

    return links;
  }
}

/**
 * Helper to calculate offset from page and limit
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Helper to calculate page from offset and limit
 */
export function calculatePage(offset: number, limit: number): number {
  return Math.floor(offset / limit) + 1;
}
