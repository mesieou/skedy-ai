// Generic seeder that works with any repository
import type { BaseEntity } from '../types/base';
import type { BaseRepository } from '../base-repository';

export class BaseSeeder<T extends BaseEntity> {
  protected createdIds: string[] = [];

  constructor(protected repository: BaseRepository<T>) {}

  // Basic production safety check (for creation)
  private checkProductionEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Seeding not allowed in production environment');
    }
  }

  // Strict test environment check (for cleanup only)
  private checkTestEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Seeding not allowed in production environment');
    }

    // Additional protection: Check if we're actually in a Jest test runner
    if (typeof (global as typeof globalThis & { expect?: unknown }).expect === 'undefined' || typeof jest === 'undefined') {
      throw new Error('Cleanup operations only allowed within Jest test environment');
    }
  }

  // Create using repository
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    this.checkProductionEnvironment();
    const record = await this.repository.create(data);
    this.createdIds.push(record.id);
    return record;
  }

  // Create with overrides (supports optional ID)
  async createWith(baseData: Omit<T, 'id' | 'created_at' | 'updated_at'>, overrides: Partial<Omit<T, 'created_at' | 'updated_at'>> = {}): Promise<T> {
    this.checkProductionEnvironment();
    const data = { ...baseData, ...overrides } as Omit<T, 'id' | 'created_at' | 'updated_at'>;
    const record = await this.repository.create(data);
    this.createdIds.push(record.id);
    return record;
  }

  // Cleanup only records created by this seeder instance
  async cleanup(): Promise<void> {
    this.checkTestEnvironment();

    if (this.createdIds.length > 0) {
      console.log(`🧹 [BaseSeeder] Cleaning up ${this.createdIds.length} records created by this test`);
      await this.repository.deleteMany(this.createdIds);
      this.createdIds = []; // Clear tracking array
    } else {
      console.log(`🧹 [BaseSeeder] No records to cleanup for this test`);
    }
  }



  // Create multiple records
  async createMultiple(items: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    this.checkProductionEnvironment();
    const results = [];
    for (const item of items) {
      const record = await this.repository.create(item);
      this.createdIds.push(record.id);
      results.push(record);
    }
    return results;
  }

  // CRUD operations
  async findOne(conditions: import('../types/base').QueryConditions): Promise<T | null> {
    return await this.repository.findOne(conditions);
  }

  async updateOne(conditions: import('../types/base').QueryConditions, updates: Partial<T>): Promise<T> {
    return await this.repository.updateOne(conditions, updates);
  }

  async deleteOne(conditions: import('../types/base').QueryConditions): Promise<void> {
    return await this.repository.deleteOne(conditions);
  }
}
