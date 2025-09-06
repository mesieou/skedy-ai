import { BaseRepository } from '../base-repository';
import type { User, CreateUserData } from '../types/user';
import type { CreateAuthUserData } from '../types/auth-user';
import { PROVIDER_ROLES } from '../types/user';
import { AuthUserRepository } from './auth-user-repository';

export class UserRepository extends BaseRepository<User> {
  private authUserRepository: AuthUserRepository;

  constructor() {
    super('users');
    this.authUserRepository = new AuthUserRepository();
  }

  async findProvidersByBusinessId(businessId: string): Promise<User[]> {
    const client = await this.getClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('business_id', businessId)
      .in('role', PROVIDER_ROLES);

    if (error) throw new Error(`Failed to find providers for business ${businessId}: ${error.message}`);
    return (data || []) as User[];
  }

  /**
   * Create user with auth user (proper database relationship)
   * Creates auth user first, then user record with the SAME ID (one-to-one relationship)
   */
  async createWithAuth(userData: CreateUserData, authUserData: CreateAuthUserData): Promise<User> {
    try {
      console.log(`👤 [UserRepository] Creating auth user first`);

      // Step 1: Create auth user first
      const authUser = await this.authUserRepository.create(authUserData);
      console.log(`✅ [UserRepository] Created auth user: ${authUser.id}`);

      // Step 2: Create user with the SAME ID as auth user (one-to-one relationship)
      const userDataWithSameId = { ...userData } as CreateUserData & { id: string };
      userDataWithSameId.id = authUser.id;

      const newUser = await this.create(userDataWithSameId);

      console.log(`✅ [UserRepository] Created user: ${newUser.first_name} (${newUser.phone_number}) with matching ID ${authUser.id}`);

      return newUser;

    } catch (error) {
      console.error(`❌ [UserRepository] Failed to create user with auth:`, error);
      throw error;
    }
  }
}
