import { UserRepository } from '../../../lib/database/repositories/user-repository';
import { UserSeeder } from '../../../lib/database/seeds/user-seeder';
import { AuthUserSeeder } from '../../../lib/database/seeds/auth-user-seeder';
import { BusinessSeeder } from '../../../lib/database/seeds/business-seeder';
import { adminProviderUserData, providerUserData } from '../../../lib/database/seeds/data/user-data';
import { removalistBusinessData } from '../../../lib/database/seeds/data/business-data';
import { adminAuthUserData, providerAuthUserData } from '../../../lib/database/seeds/data/auth-user-data';
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
    await businessSeeder.cleanup();
    
    const business = await businessSeeder.createBusinessWith(removalistBusinessData);
    businessId = business.id;
  });

  afterAll(async () => {
    await userSeeder.cleanup();
    await businessSeeder.cleanup();
  });

  it('should create a user admin/provider successfully', async () => {
    testUser = await userSeeder.createUserWith(
      { ...adminProviderUserData, business_id: businessId },
      adminAuthUserData
    );
    
    expect(testUser).toBeDefined();
    expect(testUser.id).toBeDefined();
    expect(testUser.role).toBe(UserRole.ADMIN_PROVIDER);
    expect(testUser.business_id).toBe(businessId);
    expect(testUser.first_name).toBe(adminProviderUserData.first_name);
  });

  it('should create a user provider successfully with the correct role', async () => {
    const providerUser = await userSeeder.createUserWith(
      { ...providerUserData, business_id: businessId },
      providerAuthUserData
    );
    
    expect(providerUser).toBeDefined();
    expect(providerUser.id).toBeDefined();
    expect(providerUser.role).toBe(UserRole.PROVIDER);
    expect(providerUser.business_id).toBe(businessId);
    expect(providerUser.first_name).toBe(providerUserData.first_name);
  });

  it('should create a user with another role unsuccessfully', async () => {
    const invalidUserData = {
      ...adminProviderUserData,
      business_id: businessId,
      role: 'invalid_role' as UserRole
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
