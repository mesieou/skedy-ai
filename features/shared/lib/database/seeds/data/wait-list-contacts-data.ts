import type { CreateWaitListContactData } from '../../types/wait-list-contacts';

// Test wait list contact data for seeding
export const defaultWaitListContactData: CreateWaitListContactData = {
  name: "Sarah Thompson",
  email: "sarah.thompson@gmail.com",
  phone_number: "+61423456789",
  address: "567 Brunswick Street, Fitzroy VIC 3065"
};

export const businessWaitListContactData: CreateWaitListContactData = {
  name: "David Chen",
  email: "david@techstartup.com.au", 
  phone_number: "+61434567890",
  address: "Level 3, 88 William Street, Melbourne VIC 3000"
};

export const residentialWaitListContactData: CreateWaitListContactData = {
  name: "Emma Rodriguez",
  email: "emma.rodriguez@outlook.com",
  phone_number: "+61445678901",
  address: null
};
