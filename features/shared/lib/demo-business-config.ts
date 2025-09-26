/**
 * Demo Business Configuration
 * Shared mapping of business categories to business IDs for demo
 */

import { BusinessCategory } from './database/types/business';

export const getBusinessIdByCategory = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.REMOVALIST:
      return {
        businessId: process.env.DEMO_REMOVALIST_BUSINESS_ID
      };
    case BusinessCategory.MANICURIST:
      return {
        businessId: process.env.DEMO_MANICURIST_BUSINESS_ID
      };
    case BusinessCategory.PLUMBER:
      return {
        businessId: process.env.DEMO_PLUMBER_BUSINESS_ID
      };
    default:
      // Only support these business types
      throw new Error(`Unsupported business category: ${category}. Supported: REMOVALIST, MANICURIST, PLUMBER`);
  }
};
