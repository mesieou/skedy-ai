import { AssemblyAI } from 'assemblyai';

export async function speechToText() {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! });

  const realtimeService = client.realtime.transcriber();

  realtimeService.on('open', ({ sessionId, expiresAt }) => {
    console.log('Session opened:', sessionId, 'Expires at:', expiresAt);
  });

  realtimeService.on('transcript', (transcript) => {
    console.log('Transcript:', transcript);
  });

  realtimeService.on('close', (code, reason) => {
    console.log('Connection closed:', code, reason);
  });

  await realtimeService.connect();

  return realtimeService;
}
