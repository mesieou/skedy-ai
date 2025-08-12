// Generic seeder that works with any repository
import type { BaseEntity } from '../types/base';
import type { BaseRepository } from '../base-repository';

export class BaseSeeder<T extends BaseEntity> {
  constructor(protected repository: BaseRepository<T>) {}

  // Environment safety check
  private checkTestEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Seeding not allowed in production environment');
    }
  }

  // Create using repository
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    this.checkTestEnvironment();
    return await this.repository.create(data);
  }

  // Create with overrides (supports optional ID)
  async createWith(baseData: Omit<T, 'id' | 'created_at' | 'updated_at'>, overrides: Partial<Omit<T, 'created_at' | 'updated_at'>> = {}): Promise<T> {
    this.checkTestEnvironment();
    const data = { ...baseData, ...overrides } as Omit<T, 'id' | 'created_at' | 'updated_at'>;
    return await this.repository.create(data);
  }

  // Cleanup all records using repository
  async cleanup(): Promise<void> {
    this.checkTestEnvironment();
    const records = await this.repository.findAll();
    for (const record of records) {
      await this.repository.deleteOne({ id: record.id });
    }
  }

  // Create multiple records
  async createMultiple(items: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    this.checkTestEnvironment();
    const results = [];
    for (const item of items) {
      results.push(await this.repository.create(item));
    }
    return results;
  }
}
