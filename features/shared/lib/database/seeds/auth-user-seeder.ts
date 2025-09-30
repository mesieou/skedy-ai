// Auth user seeder with test data
import { AuthUserRepository } from '../repositories/auth-user-repository';
import type { AuthUser, CreateAuthUserData } from '../types/auth-user';

export class AuthUserSeeder {
  private repository: AuthUserRepository;
  private createdIds: string[] = [];

  constructor() {
    this.repository = new AuthUserRepository();
  }

  // Create auth user with custom data
  async createAuthUserWith(data: CreateAuthUserData): Promise<AuthUser> {
    // this.checkProductionEnvironment();
    const record = await this.repository.create(data);
    this.createdIds.push(record.id);
    return record;
  }

  // Cleanup only auth users created by this seeder instance
  async cleanup(): Promise<void> {
    this.checkTestEnvironment();

    if (this.createdIds.length > 0) {
      console.log(`🧹 [AuthUserSeeder] Cleaning up ${this.createdIds.length} auth users created by this test`);
      for (const id of this.createdIds) {
        await this.repository.deleteOne({ id });
      }
      this.createdIds = []; // Clear tracking array
    } else {
      console.log(`🧹 [AuthUserSeeder] No auth users to cleanup for this test`);
    }
  }

  // private checkProductionEnvironment(): void {
  //   if (process.env.NODE_ENV === 'production') {
  //     throw new Error('Auth user seeding not allowed in production environment');
  //   }
  // }

  private checkTestEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Auth user seeding not allowed in production environment');
    }

    // Additional protection: Check if we're actually in a Jest test runner
    if (typeof (global as typeof globalThis & { expect?: unknown }).expect === 'undefined' || typeof jest === 'undefined') {
      throw new Error('Auth user cleanup operations only allowed within Jest test environment');
    }
  }
}
