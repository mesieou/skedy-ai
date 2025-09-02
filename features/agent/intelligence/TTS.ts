import { CartesiaClient } from '@cartesia/cartesia-js';

// Streaming TTS for real-time audio generation (Twilio Media Streams)
export async function* textToSpeechStream(text: string) {
  const client = new CartesiaClient({ apiKey: process.env.CARTESIA_API_KEY! });

  console.log('🎵 Starting streaming TTS for:', text.substring(0, 50) + '...');

  const response = await client.tts.sse({
    modelId: 'sonic-turbo',
    transcript: text,
    voice: {
      mode: 'id',
      id: '694f9389-aac1-45b6-b726-9d9369183238',
    },
    language: 'en',
    outputFormat: {
      container: 'raw',
      sampleRate: 8000,
      encoding: 'pcm_s16le',
    },
  });

  for await (const chunk of response) {
    if ('chunk' in chunk && chunk.chunk) {
      const audioData = chunk.chunk as string;
      console.log('🎵 Streaming audio chunk:', audioData.length, 'bytes');
      yield Buffer.from(audioData, 'base64');
    }
  }
}
