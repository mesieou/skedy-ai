import axios from 'axios';
import { CallAcceptConfig, getAuthHeaders } from './config';

export interface CallAcceptResponse {
  success: boolean;
  status: number;
  data?: {
    call_id?: string;
    status?: string;
    message?: string;
  };
  error?: string;
}

export class CallService {
  private baseUrl = 'https://api.openai.com/v1/realtime/calls';

  constructor(private apiKey: string) {}

  async acceptCall(callId: string, config: CallAcceptConfig): Promise<CallAcceptResponse> {
    console.log(`📞 Attempting to accept call: ${callId}`);

    const acceptUrl = `${this.baseUrl}/${callId}/accept`;
    console.log(`🔗 Accept URL: ${acceptUrl}`);

    try {
      const response = await axios.post(
        acceptUrl,
        config,
        {
          headers: {
            ...getAuthHeaders(this.apiKey),
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        }
      );

      console.log(`📞 Accept call response status: ${response.status}`);
      console.log(`📞 Accept call response data:`, response.data);

      if (response.status === 404) {
        console.error('❌ Call accept endpoint returned 404. Possible causes:');
        console.error('   1. The endpoint URL is incorrect');
        console.error('   2. The call ID is invalid or expired');
        console.error('   3. The API endpoint has changed');

        return await this.tryAlternativeEndpoint(callId, config);
      }

      if (response.status >= 400) {
        console.error(`❌ Call accept failed with status: ${response.status}`);
        console.error('❌ Response:', response.data);

        return {
          success: false,
          status: response.status,
          data: response.data,
          error: `Call accept failed with status ${response.status}`,
        };
      }

      console.log('✅ Call accepted successfully');
      return {
        success: true,
        status: response.status,
        data: response.data,
      };

    } catch (error) {
      console.error('❌ Error accepting call:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const axiosErr = error as { response?: { status?: number; data?: unknown } };
        console.error('❌ Error response status:', axiosErr.response?.status);
        console.error('❌ Error response data:', axiosErr.response?.data);

        return {
          success: false,
          status: axiosErr.response?.status || 500,
          error: `Network error: ${axiosErr.response?.status}`,
        };
      }

      return {
        success: false,
        status: 500,
        error: 'Unknown error occurred',
      };
    }
  }

  private async tryAlternativeEndpoint(callId: string, config: CallAcceptConfig): Promise<CallAcceptResponse> {
    console.log('🔄 Trying alternative endpoint format...');

    const altUrl = `${this.baseUrl}/${callId}`;
    console.log(`🔗 Alternative URL: ${altUrl}`);

    try {
      const altResponse = await axios.post(
        altUrl,
        { ...config, action: 'accept' },
        {
          headers: {
            ...getAuthHeaders(this.apiKey),
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status < 500,
        }
      );

      console.log(`📞 Alternative endpoint response status: ${altResponse.status}`);
      console.log(`📞 Alternative endpoint response data:`, altResponse.data);

      if (altResponse.status >= 400) {
        console.error('❌ Alternative endpoint also failed. The call might be invalid or the API has changed.');

        return {
          success: false,
          status: altResponse.status,
          data: altResponse.data,
          error: 'Both primary and alternative endpoints failed',
        };
      }

      console.log('✅ Call accepted via alternative endpoint');
      return {
        success: true,
        status: altResponse.status,
        data: altResponse.data,
      };

    } catch (altError) {
      console.error('❌ Alternative endpoint also failed:', altError);

      return {
        success: false,
        status: 500,
        error: 'Both primary and alternative endpoints failed',
      };
    }
  }
}
