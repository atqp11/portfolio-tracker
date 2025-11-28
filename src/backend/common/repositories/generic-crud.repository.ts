/**
 * Generic CRUD Repository
 *
 * Pre-configured repository for simple entities that only need basic CRUD operations.
 * Use this for straightforward entities without complex business logic.
 *
 * Example usage:
 * ```typescript
 * const taskRepo = new GenericCrudRepository<Task>('tasks');
 * const tasks = await taskRepo.findAll();
 * ```
 */

import { BaseRepository, SupabaseClientFactory } from './base.repository';
import { RepositoryConfig } from './types';

/**
 * Generic CRUD repository that can be instantiated for any entity
 */
export class GenericCrudRepository<T extends Record<string, any>> extends BaseRepository<T> {
  protected tableName: string;

  constructor(
    tableName: string,
    supabaseClientFactory: SupabaseClientFactory,
    config?: RepositoryConfig
  ) {
    super(supabaseClientFactory, config);
    this.tableName = tableName;
  }
}

/**
 * Factory function to create generic repositories
 */
export function createRepository<T extends Record<string, any>>(
  tableName: string,
  supabaseClientFactory: SupabaseClientFactory,
  config?: RepositoryConfig
): GenericCrudRepository<T> {
  return new GenericCrudRepository<T>(tableName, supabaseClientFactory, config);
}

/**
 * Repository registry for caching repository instances
 */
class RepositoryRegistry {
  private static instances: Map<string, GenericCrudRepository<any>> = new Map();

  static get<T extends Record<string, any>>(
    tableName: string,
    supabaseClientFactory: SupabaseClientFactory,
    config?: RepositoryConfig
  ): GenericCrudRepository<T> {
    const key = `${tableName}:${JSON.stringify(config || {})}`;

    if (!this.instances.has(key)) {
      this.instances.set(key, new GenericCrudRepository<T>(tableName, supabaseClientFactory, config));
    }

    return this.instances.get(key)!;
  }

  static clear(): void {
    this.instances.clear();
  }
}

/**
 * Get or create a cached repository instance
 */
export function getRepository<T extends Record<string, any>>(
  tableName: string,
  supabaseClientFactory: SupabaseClientFactory,
  config?: RepositoryConfig
): GenericCrudRepository<T> {
  return RepositoryRegistry.get<T>(tableName, supabaseClientFactory, config);
}

/**
 * Clear all cached repository instances (useful for testing)
 */
export function clearRepositoryCache(): void {
  RepositoryRegistry.clear();
}
