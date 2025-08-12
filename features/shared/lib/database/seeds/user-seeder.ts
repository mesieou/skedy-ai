// User seeder with multiple role data
import { BaseSeeder } from './base-seeder';
import { UserRepository } from '../repositories/user-repository';
import { AuthUserSeeder } from './auth-user-seeder';
import type { User, CreateUserData } from '../types/user';
import type { CreateAuthUserData } from '../types/auth-user';

export class UserSeeder extends BaseSeeder<User> {
  private authUserSeeder: AuthUserSeeder;

  constructor(authUserSeeder?: AuthUserSeeder) {
    super(new UserRepository());
    this.authUserSeeder = authUserSeeder || new AuthUserSeeder();
  }

  // Create user with custom data
  async createUserWith(userData: CreateUserData, authUserData: CreateAuthUserData): Promise<User> {
    // Create auth user first using provided data
    const authUser = await this.authUserSeeder.createAuthUserWith(authUserData);
    
    // Create public user record with auth user ID
    return await this.createWith(userData, { id: authUser.id });
  }

  // Override cleanup to delegate auth user cleanup
  async cleanup(): Promise<void> {
    await super.cleanup(); // Clean public user records
    await this.authUserSeeder.cleanup(); // Clean auth users
  }
}
