// Services
export { OnboardingSessionService } from './lib/services/onboarding-session-service';
export { OnboardingAgentService } from './lib/services/onboarding-agent-service';
export { WebsiteAnalyzerService } from './lib/services/website-analyzer-service';
export { BusinessSetupService } from './lib/services/business-setup-service';

// Types
export type {
  OnboardingSession,
  OnboardingInteraction,
  OnboardingSessionData,
  BusinessAnalysis,
  CreateOnboardingSessionParams,
  UpdateOnboardingSessionParams
} from './lib/types/onboarding-session';

export { OnboardingStatus } from './lib/types/onboarding-session';

// Constants
export {
  ONBOARDING_STEPS,
  getStepByStatus,
  getNextStep,
  getPreviousStep,
  calculateProgress
} from './lib/constants/onboarding-steps';

// Components
export { OnboardingContainer } from './components/onboarding-container';
export { OnboardingChat } from './components/onboarding-chat';
export { OnboardingProgress } from './components/onboarding-progress';
export { BusinessInfoReview } from './components/business-info-review';
