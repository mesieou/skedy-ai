import { useState, useCallback, useRef, useEffect } from 'react';

// TypeScript declarations for Web Speech API
// Using any to avoid TypeScript errors with browser APIs

/**
 * Voice Chat Hook for Onboarding
 * Provides text-to-speech (AI speaks) and speech-to-text (user speaks)
 */
export function useVoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const onTranscriptRef = useRef<((text: string) => void) | null>(null);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const speechSynthesis = window.speechSynthesis;
    
    if (SpeechRecognition && speechSynthesis) {
      setIsSupported(true);
      synthesisRef.current = speechSynthesis;
      
      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('🎤 [Voice] Listening started');
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🎤 [Voice] Transcript:', transcript);
        
        if (onTranscriptRef.current) {
          onTranscriptRef.current(transcript);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('❌ [Voice] Recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('🎤 [Voice] Listening ended');
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    } else {
      console.warn('⚠️ [Voice] Speech APIs not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  /**
   * Start listening for user speech
   */
  const startListening = useCallback((onTranscript: (text: string) => void) => {
    if (!recognitionRef.current || isListening) return;
    
    onTranscriptRef.current = onTranscript;
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('❌ [Voice] Failed to start listening:', error);
    }
  }, [isListening]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  /**
   * Speak text using text-to-speech
   */
  const speak = useCallback((text: string) => {
    if (!synthesisRef.current) return;
    
    // Cancel any ongoing speech
    synthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
      console.log('🔊 [Voice] Speaking started');
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      console.log('🔊 [Voice] Speaking ended');
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('❌ [Voice] Speech error:', event.error);
      setIsSpeaking(false);
    };
    
    synthesisRef.current.speak(utterance);
  }, []);

  /**
   * Stop speaking
   */
  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isSupported,
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
