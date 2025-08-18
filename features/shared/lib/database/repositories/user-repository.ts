import { BaseRepository } from '../base-repository';
import type { User } from '../types/user';
import { PROVIDER_ROLES } from '../types/user';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users');
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
}