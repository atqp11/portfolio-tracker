/**
 * Base Service Class
 *
 * Provides common service functionality that all domain services can extend.
 * Handles business logic orchestration, validation, and data transformation.
 */

import { BaseRepository } from '@/lib/repositories/base/base.repository';
import { FindOptions, PaginatedResult, QueryFilter } from '@/lib/repositories/base/types';
// Validation now handled by Zod schemas in lib/validators/schemas.ts

/**
 * Service interface
 */
export interface IService<T, CreateDTO, UpdateDTO> {
  findAll(options?: FindOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T>;
  delete(id: string): Promise<void>;
}

/**
 * Abstract base service class
 * @template T - Entity type
 * @template CreateDTO - Create data transfer object type
 * @template UpdateDTO - Update data transfer object type
 */
export abstract class BaseService<T extends Record<string, any>, CreateDTO = Partial<T>, UpdateDTO = Partial<T>>
  implements IService<T, CreateDTO, UpdateDTO> {

  constructor(
    protected repository: BaseRepository<T>,
    protected validator?: any // Validator instance for the entity
  ) {}

  /**
   * Find all entities with optional filtering
   */
  async findAll(options?: FindOptions): Promise<T[]> {
    return this.repository.findAll(options);
  }

  /**
   * Find paginated entities
   */
  async findPaginated(options: FindOptions & { pagination: { page: number; limit: number } }): Promise<PaginatedResult<T>> {
    return this.repository.findPaginated(options);
  }

  /**
   * Find entity by ID
   */
  async findById(id: string): Promise<T | null> {
    return this.repository.findById(id);
  }

  /**
   * Find single entity matching filters
   */
  async findOne(filters: QueryFilter[]): Promise<T | null> {
    return this.repository.findOne(filters);
  }

  /**
   * Create a new entity
   */
  async create(data: CreateDTO): Promise<T> {
    // Validate data
    if (this.validator && this.validator.validateCreate) {
      this.validator.validateCreate(data);
    }

    // Transform DTO to entity data
    const entityData = this.transformCreateDTO(data);

    // Execute before create hook
    await this.beforeCreate(entityData);

    // Create entity
    const entity = await this.repository.create(entityData);

    // Execute after create hook
    await this.afterCreate(entity);

    return entity;
  }

  /**
   * Create multiple entities
   */
  async createMany(data: CreateDTO[]): Promise<T[]> {
    // Validate all data
    if (this.validator && this.validator.validateCreate) {
      data.forEach(item => this.validator.validateCreate(item));
    }

    // Transform DTOs
    const entityData = data.map(item => this.transformCreateDTO(item));

    // Execute before create hook for each
    await Promise.all(entityData.map(item => this.beforeCreate(item)));

    // Create entities
    const entities = await this.repository.createMany(entityData);

    // Execute after create hook for each
    await Promise.all(entities.map(entity => this.afterCreate(entity)));

    return entities;
  }

  /**
   * Update an entity by ID
   */
  async update(id: string, data: UpdateDTO): Promise<T> {
    // Validate data
    if (this.validator && this.validator.validateUpdate) {
      this.validator.validateUpdate(data);
    }

    // Transform DTO to entity data
    const entityData = this.transformUpdateDTO(data);

    // Execute before update hook
    await this.beforeUpdate(id, entityData);

    // Update entity
    const entity = await this.repository.update(id, entityData);

    // Execute after update hook
    await this.afterUpdate(entity);

    return entity;
  }

  /**
   * Update multiple entities matching filters
   */
  async updateMany(filters: QueryFilter[], data: UpdateDTO): Promise<number> {
    // Validate data
    if (this.validator && this.validator.validateUpdate) {
      this.validator.validateUpdate(data);
    }

    // Transform DTO
    const entityData = this.transformUpdateDTO(data);

    // Update entities
    return this.repository.updateMany(filters, entityData);
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string): Promise<void> {
    // Execute before delete hook
    await this.beforeDelete(id);

    // Delete entity
    await this.repository.delete(id);

    // Execute after delete hook
    await this.afterDelete(id);
  }

  /**
   * Delete multiple entities matching filters
   */
  async deleteMany(filters: QueryFilter[]): Promise<number> {
    return this.repository.deleteMany(filters);
  }

  /**
   * Count entities matching filters
   */
  async count(filters?: QueryFilter[]): Promise<number> {
    return this.repository.count(filters);
  }

  /**
   * Check if entity exists
   */
  async exists(filters: QueryFilter[]): Promise<boolean> {
    return this.repository.exists(filters);
  }

  /**
   * Transform create DTO to entity data
   * Override in subclasses for custom transformation
   */
  protected transformCreateDTO(dto: CreateDTO): Partial<T> {
    return dto as Partial<T>;
  }

  /**
   * Transform update DTO to entity data
   * Override in subclasses for custom transformation
   */
  protected transformUpdateDTO(dto: UpdateDTO): Partial<T> {
    return dto as Partial<T>;
  }

  /**
   * Hook called before create
   * Override in subclasses for custom logic
   */
  protected async beforeCreate(data: Partial<T>): Promise<void> {
    // No-op by default
  }

  /**
   * Hook called after create
   * Override in subclasses for custom logic
   */
  protected async afterCreate(entity: T): Promise<void> {
    // No-op by default
  }

  /**
   * Hook called before update
   * Override in subclasses for custom logic
   */
  protected async beforeUpdate(id: string, data: Partial<T>): Promise<void> {
    // No-op by default
  }

  /**
   * Hook called after update
   * Override in subclasses for custom logic
   */
  protected async afterUpdate(entity: T): Promise<void> {
    // No-op by default
  }

  /**
   * Hook called before delete
   * Override in subclasses for custom logic
   */
  protected async beforeDelete(id: string): Promise<void> {
    // No-op by default
  }

  /**
   * Hook called after delete
   * Override in subclasses for custom logic
   */
  protected async afterDelete(id: string): Promise<void> {
    // No-op by default
  }
}

/**
 * Service factory helper
 */
export class ServiceFactory {
  private static services: Map<string, any> = new Map();

  /**
   * Register a service instance
   */
  static register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a registered service instance
   */
  static get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not registered`);
    }
    return service as T;
  }

  /**
   * Check if service is registered
   */
  static has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Clear all registered services (useful for testing)
   */
  static clear(): void {
    this.services.clear();
  }
}
