import { addPromptToSession } from '../addPromptToSession';
import { BusinessPromptRepository } from '../../../shared/lib/database/repositories/business-prompt-repository';
import { BusinessRepository } from '../../../shared/lib/database/repositories/business-repository';
import { BusinessToolsRepository } from '../../../shared/lib/database/repositories/business-tools-repository';
import { ServiceRepository } from '../../../shared/lib/database/repositories/service-repository';
import { PROMPTS_NAMES } from '../../../shared/lib/database/types/prompt';
import { createUniqueRemovalistBusinessData } from '../../../shared/lib/database/seeds/data/business-data';
import { removalistPrompt } from '../../../shared/lib/database/seeds/data/prompts-data';
import { removalistTools } from '../../../shared/lib/database/seeds/data/tools-data';
import { removalistExample1ServiceData } from '../../../shared/lib/database/seeds/data/services-data';
import type { Session } from '../../sessions/session';
import type { Business } from '../../../shared/lib/database/types/business';
import type { Prompt } from '../../../shared/lib/database/types/prompt';

// Mock the repositories
jest.mock('../../../shared/lib/database/repositories/business-prompt-repository');
jest.mock('../../../shared/lib/database/repositories/business-repository');
jest.mock('../../../shared/lib/database/repositories/business-tools-repository');
jest.mock('../../../shared/lib/database/repositories/service-repository');

const mockBusinessPromptRepo = jest.mocked(BusinessPromptRepository);
const mockBusinessRepo = jest.mocked(BusinessRepository);
const mockBusinessToolsRepo = jest.mocked(BusinessToolsRepository);
// ServiceRepository will be mocked directly in tests

describe('addPromptToSession - Template Injection', () => {
  let mockSession: Session;
  let mockBusiness: Business;
  let mockPrompt: Prompt;

  beforeEach(() => {
    jest.clearAllMocks();

    // Use real business data from seeds
    const businessData = createUniqueRemovalistBusinessData();
    mockBusiness = {
      ...businessData,
      id: 'business-123'
    } as Business;

    // Mock session with realistic data
    mockSession = {
      id: 'session-123',
      businessId: 'business-123',
      businessEntity: mockBusiness,
      customerPhoneNumber: '+61412345678',
      status: 'active',
      channel: 'phone',
      assignedApiKeyIndex: 0,
      openAiConversationId: 'conv-123',
      interactions: [],
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        uncachedTokens: 0,
        audioInputTokens: 0,
        audioOutputTokens: 0,
        totalCost: 0,
        lastUpdated: 0
      },
      startedAt: Date.now(),
      serviceNames: [],
      allAvailableToolNames: [],
      currentTools: [],
      isFirstAiResponse: true,
      quotes: []
    } as Session;

    // Use real prompt template from seeds
    mockPrompt = {
      ...removalistPrompt,
      id: 'prompt-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    } as Prompt;
  });

  test('should inject SERVICE NAMES and BUSINESS INFO into prompt template', async () => {
    // Arrange - use real data from seeds
    const realToolNames = removalistTools.map(tool => tool.name);
    const realServiceNames = [removalistExample1ServiceData.name, '1 Bedroom Home Move', 'Studio Apartment Move'];
    const mockServices = realServiceNames.map((name, index) => ({
      id: `service-${index}`,
      name,
      business_id: mockBusiness.id
    }));

    // Mock repository responses with real data
    mockBusinessToolsRepo.prototype.getActiveToolNamesForBusiness = jest.fn().mockResolvedValue(realToolNames);
    mockBusinessPromptRepo.prototype.getActivePromptByNameForBusiness = jest.fn().mockResolvedValue(mockPrompt);
    (ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll = jest.fn().mockResolvedValue(mockServices);

    // Mock buildBusinessInfoForCustomers to return realistic business info
    const expectedBusinessInfo = `${mockBusiness.name} - ${mockBusiness.address} - Phone: ${mockBusiness.phone_number}`;
    mockBusinessRepo.prototype.buildBusinessInfoForCustomers = jest.fn().mockReturnValue(expectedBusinessInfo);

    // Act
    await addPromptToSession(mockSession);

    // Assert - verify template injection worked
    expect(mockSession.aiInstructions).toBeDefined();

    // Should contain injected SERVICE NAMES (not tool names)
    expect(mockSession.aiInstructions).toContain(realServiceNames.join(', '));
    expect(mockSession.aiInstructions).toContain('1 Bedroom Home Move');
    expect(mockSession.aiInstructions).toContain(removalistExample1ServiceData.name);

    // Should contain injected business info
    expect(mockSession.aiInstructions).toContain(expectedBusinessInfo);

    // Should NOT contain template placeholders
    expect(mockSession.aiInstructions).not.toContain('{BUSINESS_TYPE}');
    expect(mockSession.aiInstructions).not.toContain('{LIST OF SERVICES}');
    expect(mockSession.aiInstructions).not.toContain('{BUSINESS INFO}');

    // Should contain the actual prompt structure from seeds with business type injected
    expect(mockSession.aiInstructions).toContain('You are Skedy an AI receptionist for removalist services');
    expect(mockSession.aiInstructions).toContain('PERSONALITY: Friendly, direct, Aussie');

    // Verify session metadata is set correctly
    expect(mockSession.promptName).toBe(PROMPTS_NAMES.MAIN_CONVERSATION);
    expect(mockSession.promptVersion).toBe('v1.0.0');
    expect(mockSession.allAvailableToolNames).toEqual(realToolNames);
    expect(mockSession.serviceNames).toEqual(realServiceNames); // ✅ Now populated with service names
  });

  test('should call repositories with correct parameters using real business ID', async () => {
    // Arrange - use real tool names and realistic responses
    const realToolNames = removalistTools.map(tool => tool.name);
    const mockServices = [{ id: 'service-1', name: removalistExample1ServiceData.name, business_id: mockBusiness.id }];

    mockBusinessToolsRepo.prototype.getActiveToolNamesForBusiness = jest.fn().mockResolvedValue(realToolNames);
    mockBusinessPromptRepo.prototype.getActivePromptByNameForBusiness = jest.fn().mockResolvedValue(mockPrompt);
    (ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll = jest.fn().mockResolvedValue(mockServices);
    mockBusinessRepo.prototype.buildBusinessInfoForCustomers = jest.fn().mockReturnValue(`${mockBusiness.name} - ${mockBusiness.address}`);

    // Act
    await addPromptToSession(mockSession);

    // Assert - verify correct repository calls
    expect(mockBusinessToolsRepo.prototype.getActiveToolNamesForBusiness).toHaveBeenCalledWith(mockBusiness.id);
    expect(mockBusinessPromptRepo.prototype.getActivePromptByNameForBusiness).toHaveBeenCalledWith(mockBusiness.id, PROMPTS_NAMES.MAIN_CONVERSATION);
    expect((ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll).toHaveBeenCalledWith({}, { business_id: mockBusiness.id });
    expect(mockBusinessRepo.prototype.buildBusinessInfoForCustomers).toHaveBeenCalledWith(mockBusiness);
  });

  test('should verify service names injection works correctly', async () => {
    // This test verifies the fix: LIST OF SERVICES should contain service names, not tool names
    const realToolNames = removalistTools.map(tool => tool.name);
    const realServiceNames = [removalistExample1ServiceData.name, '1 Bedroom Home Move'];
    const mockServices = realServiceNames.map((name, index) => ({
      id: `service-${index}`,
      name,
      business_id: mockBusiness.id
    }));

    mockBusinessToolsRepo.prototype.getActiveToolNamesForBusiness = jest.fn().mockResolvedValue(realToolNames);
    mockBusinessPromptRepo.prototype.getActivePromptByNameForBusiness = jest.fn().mockResolvedValue(mockPrompt);
    (ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll = jest.fn().mockResolvedValue(mockServices);
    mockBusinessRepo.prototype.buildBusinessInfoForCustomers = jest.fn().mockReturnValue(`${mockBusiness.name} - ${mockBusiness.address} - Phone: ${mockBusiness.phone_number}`);

    // Act
    await addPromptToSession(mockSession);

    // Assert - verify service names are correctly injected
    console.log('Final prompt:', mockSession.aiInstructions);

    // Should contain service names (not tool names)
    expect(mockSession.aiInstructions).toContain(realServiceNames.join(', '));
    expect(mockSession.aiInstructions).toContain('1 Bedroom Home Move');
    expect(mockSession.aiInstructions).toContain(removalistExample1ServiceData.name);

    // Should contain business info
    expect(mockSession.aiInstructions).toContain(mockBusiness.name);
  });

  test('should populate session.serviceNames from ServiceRepository', async () => {
    // This test verifies that session.serviceNames gets populated with real service names
    const realToolNames = removalistTools.map(tool => tool.name);
    const realServiceNames = [removalistExample1ServiceData.name, '1 Bedroom Home Move'];
    const mockServices = realServiceNames.map((name, index) => ({
      id: `service-${index}`,
      name,
      business_id: mockBusiness.id
    }));

    mockBusinessToolsRepo.prototype.getActiveToolNamesForBusiness = jest.fn().mockResolvedValue(realToolNames);
    mockBusinessPromptRepo.prototype.getActivePromptByNameForBusiness = jest.fn().mockResolvedValue(mockPrompt);
    (ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll = jest.fn().mockResolvedValue(mockServices);
    mockBusinessRepo.prototype.buildBusinessInfoForCustomers = jest.fn().mockReturnValue('Test Business Info');

    // Act
    await addPromptToSession(mockSession);

    // Assert - session.serviceNames should now be populated
    console.log('Session serviceNames:', mockSession.serviceNames);
    expect(mockSession.serviceNames).toEqual(realServiceNames); // ✅ Now populated with real service names
    expect((ServiceRepository as jest.MockedClass<typeof ServiceRepository>).prototype.findAll).toHaveBeenCalledWith({}, { business_id: mockBusiness.id });

    // This is needed for getServiceDetails fuzzy matching to work
  });
});
