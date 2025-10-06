export interface PaymentLinkData {
  quoteId: string;
  customerId: string;
  businessId: string;
  serviceDescription: string;
  businessName: string;
  customerName: string;
  depositAmount: number;
  platformFee: number; // Platform fee from quote breakdown
}

export interface CreatePaymentLinkResult {
  success: boolean;
  paymentLink?: string;
  error?: string;
}

export interface CheckPaymentStatusResult {
  success: boolean;
  data?: {
    payment_status: string;
    quote_id: string;
    amount: number;
    payment_link?: string;
    stripe_session_id?: string;
  };
  error?: string;
}
