/**
 * Demo Business Configuration
 * Shared mapping of business categories to business IDs for demo
 */

import { BusinessCategory } from './database/types/business';

export const getBusinessIdByCategory = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.REMOVALIST:
      return {
        businessId: "b9e38de7-eb63-4cbc-a4cf-96edcd5862da", // Removalist business ID
      };
    case BusinessCategory.MANICURIST:
      return {
        businessId: "b8d6fc83-ee1f-4ffd-aae9-403eb70cc5e6", // Manicurist business ID
      };
    case BusinessCategory.PLUMBER:
      return {
        businessId: "d33d1803-1a19-4c28-9dc4-b5ad201bd517", // Plumber business ID
      };
    default:
      // Only support these business types
      throw new Error(`Unsupported business category: ${category}. Supported: REMOVALIST, MANICURIST, PLUMBER`);
  }
};
