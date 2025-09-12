import type { Service } from './service';
import type { FrequentQuestion } from './frequent-questions';

export interface BusinessContext {
    businessInfo: {
        name: string;
        description: string;
        address: string;
        phone: string;
        email: string;
        website: string;
        time_zone: string;
        language: string;
        business_category: string;
        currency_code: string;
        payment_methods: string[];
        preferred_payment_method: string;
        charges_deposit: boolean;
        charges_gst: boolean;
        prices_include_gst: boolean;
        deposit_percentage?: number;
        deposit_fixed_amount?: number;
        offer_mobile_services?: boolean;
        offer_location_services?: boolean;
    };
    services: Service[];
    frequently_asked_questions: FrequentQuestion[];
}
