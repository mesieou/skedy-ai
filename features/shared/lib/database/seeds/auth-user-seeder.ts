// Auth user seeder with test data
import { AuthUserRepository } from '../repositories/auth-user-repository';
import type { AuthUser, CreateAuthUserData } from '../types/auth-user';

export class AuthUserSeeder {
  private repository: AuthUserRepository;

  constructor() {
    this.repository = new AuthUserRepository();
    this.checkTestEnvironment();
  }

  // Create auth user with custom data
  async createAuthUserWith(data: CreateAuthUserData): Promise<AuthUser> {
    return await this.repository.create(data);
  }

  // Cleanup all created auth users
  async cleanup(): Promise<void> {
    this.checkTestEnvironment();
    const records = await this.repository.findAll();
    for (const record of records) {
      await this.repository.deleteOne({ id: record.id });
    }
  }

  private checkTestEnvironment(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Auth user seeding not allowed in production environment');
    }
  }
}
