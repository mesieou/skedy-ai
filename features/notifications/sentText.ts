import twilio from 'twilio';

/**
 * Send SMS via Twilio - simple and straightforward
 */
export async function sendText(to: string, message: string, from: string): Promise<{ success: boolean; error?: string }> {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const result = await client.messages.create({
      body: message,
      from: from,
      to: formatAustralianPhone(to)
    });

    console.log(`✅ SMS sent to ${to}: ${result.sid}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ SMS failed to ${to}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format Australian phone numbers: 0413 678 116 -> +61413678116
 */
function formatAustralianPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return '+61' + cleaned.substring(1);

  return '+61' + cleaned;
}
