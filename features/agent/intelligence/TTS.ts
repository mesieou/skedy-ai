import { CartesiaClient } from '@cartesia/cartesia-js';

export async function textToSpeech(text: string) {
  const client = new CartesiaClient({ apiKey: process.env.CARTESIA_API_KEY! });

  const response = await client.tts.bytes({
    modelId: 'sonic-turbo',
    transcript: text,
    voice: {
      mode: 'id',
      id: '694f9389-aac1-45b6-b726-9d9369183238', // Default voice ID
    },
    language: 'en',
    outputFormat: {
      container: 'wav',
      sampleRate: 44100,
      encoding: 'pcm_f32le',
    },
  });

  return response;
}
