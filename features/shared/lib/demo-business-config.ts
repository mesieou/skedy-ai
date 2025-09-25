/**
 * Demo Business Configuration
 * Shared mapping of business categories to business IDs for demo
 */

import { BusinessCategory } from './database/types/business';

export const getBusinessIdByCategory = (category: BusinessCategory) => {
  switch (category) {
    case BusinessCategory.REMOVALIST:
      return {
        businessId: "8eea40ae-7d0f-4a72-8041-847cb42e6996", // Removalist business ID
      };
    case BusinessCategory.MANICURIST:
      return {
        businessId: "0679ddaa-98ac-4341-80a3-98ac25a65d3c", // Manicurist business ID
      };
    case BusinessCategory.PLUMBER:
      return {
        businessId: "fbcab214-5992-4386-90b3-a32a2f07f14d", // Plumber business ID
      };
    default:
      // Only support these business types
      throw new Error(`Unsupported business category: ${category}. Supported: REMOVALIST, MANICURIST, PLUMBER`);
  }
};
