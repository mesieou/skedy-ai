import { UserRepository } from '../../../lib/database/repositories/user-repository';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { createUniqueRemovalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import { UserRole } from '../../../lib/database/types/user';
import type { User } from '../../../lib/database/types/user';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let userSeeder: UserSeeder;
  let authUserSeeder: AuthUserSeeder;
  let businessSeeder: BusinessSeeder;
  let businessId: string;
  let testUser: User;

  beforeAll(async () => {
    userRepository = new UserRepository();
    authUserSeeder = new AuthUserSeeder();
    userSeeder = new UserSeeder(authUserSeeder);
    businessSeeder = new BusinessSeeder();
    
    // Clean up and create a business first
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
    
    const business = await businessSeeder.createBusinessWith(createUniqueRemovalistBusinessData());
    businessId = business.id;
  });

  afterAll(async () => {
    await userSeeder.cleanup();
    await authUserSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  it('should create a user admin/provider successfully', async () => {
    testUser = await userSeeder.createUniqueAdminProviderUser(businessId);
    
    expect(testUser).toBeDefined();
    expect(testUser.id).toBeDefined();
    expect(testUser.role).toBe(UserRole.ADMIN_PROVIDER);
    expect(testUser.business_id).toBe(businessId);
    expect(testUser.first_name).toBe("David");
    expect(testUser.email).toContain('david+');
  });

  it('should create a user provider successfully with the correct role', async () => {
    const providerUser = await userSeeder.createUniqueProviderUser(businessId);
    
    expect(providerUser).toBeDefined();
    expect(providerUser.id).toBeDefined();
    expect(providerUser.role).toBe(UserRole.PROVIDER);
    expect(providerUser.business_id).toBe(businessId);
    expect(providerUser.first_name).toBe("Sarah");
    expect(providerUser.email).toContain('sarah+');
  });

  it('should create a user with another role unsuccessfully', async () => {
    const invalidUserData = {
      role: 'invalid_role' as UserRole,
      first_name: "Invalid",
      business_id: businessId,
      last_name: "User",
      phone_number: "+61400000000",
      email: "invalid@test.com",
    };

    await expect(userRepository.create(invalidUserData)).rejects.toThrow();
  });

  it('should find a user by phone number successfully', async () => {
    const foundUser = await userRepository.findOne({ 
      phone_number: testUser.phone_number 
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(testUser.id);
    expect(foundUser?.phone_number).toBe(testUser.phone_number);
  });

  it('should update a user successfully', async () => {
    const updatedFirstName = 'Updated Name';
    const updatedUser = await userRepository.updateOne(
      { id: testUser.id },
      { first_name: updatedFirstName }
    );

    expect(updatedUser.first_name).toBe(updatedFirstName);
    expect(updatedUser.id).toBe(testUser.id);
    expect(updatedUser.role).toBe(testUser.role);
  });

  it('should delete a user successfully', async () => {
    await userRepository.deleteOne({ id: testUser.id });

    const deletedUser = await userRepository.findOne({ id: testUser.id });
    expect(deletedUser).toBeNull();
  });
});
