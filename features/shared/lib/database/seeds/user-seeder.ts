// User seeder with multiple role data
import { BaseSeeder } from './base-seeder';
import { UserRepository } from '../repositories/user-repository';
import { AuthUserSeeder } from './auth-user-seeder';
import type { User, CreateUserData } from '../types/user';
import type { CreateAuthUserData } from '../types/auth-user';
import { 
  createUniqueAdminProviderUserData, 
  createUniqueProviderUserData, 
  createUniqueCustomerUserData 
} from './data/user-data';
import { 
  createUniqueAdminAuthUserData, 
  createUniqueProviderAuthUserData, 
  createUniqueCustomerAuthUserData 
} from './data/auth-user-data';

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

  // Create unique admin/provider user for tests (avoids parallel test conflicts)
  async createUniqueAdminProviderUser(businessId: string): Promise<User> {
    return await this.createUserWith(
      createUniqueAdminProviderUserData(businessId),
      createUniqueAdminAuthUserData()
    );
  }

  // Create unique provider user for tests (avoids parallel test conflicts)
  async createUniqueProviderUser(businessId: string): Promise<User> {
    return await this.createUserWith(
      createUniqueProviderUserData(businessId),
      createUniqueProviderAuthUserData()
    );
  }

  // Create unique customer user for tests (avoids parallel test conflicts)
  async createUniqueCustomerUser(businessId: string): Promise<User> {
    return await this.createUserWith(
      createUniqueCustomerUserData(businessId),
      createUniqueCustomerAuthUserData()
    );
  }

  // Override cleanup to delegate auth user cleanup
  async cleanup(): Promise<void> {
    await super.cleanup(); // Clean public user records
    await this.authUserSeeder.cleanup(); // Clean auth users
  }
}
