"use client";

import { useState, useRef, useEffect } from 'react';
import { OnboardingSession, OnboardingInteraction } from '../lib/types/onboarding-session';
import { Button, Input, Card, CardContent } from '@/features/shared';
import { Send, Loader2 } from 'lucide-react';
import { AnalysisProgress } from './analysis-progress';
import { ScrapingProgress } from './scraping-progress';

interface OnboardingChatProps {
  session: OnboardingSession;
  onSessionUpdate?: (session: OnboardingSession) => void;
}

export function OnboardingChat({ session, onSessionUpdate }: OnboardingChatProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzingWebsite, setIsAnalyzingWebsite] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Thinking...');
  const [interactions, setInteractions] = useState<OnboardingInteraction[]>(session.interactions);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interactions]);

  // Update interactions when session changes
  useEffect(() => {
    setInteractions(session.interactions);
  }, [session.interactions]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    console.log('\n💬 [OnboardingChat] ========================================');
    console.log('💬 [OnboardingChat] Sending message:', userMessage.substring(0, 100));
    console.log('💬 [OnboardingChat] Session ID:', session.id);

    // Optimistically add user message to UI
    const optimisticInteraction: OnboardingInteraction = {
      id: `temp-${Date.now()}`,
      onboardingSessionId: session.id,
      role: 'user',
      content: userMessage,
      createdAt: Date.now()
    };
    setInteractions(prev => [...prev, optimisticInteraction]);

    // Check if message looks like a URL - show website analysis UI
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/;
    const isUrl = urlPattern.test(userMessage);
    
    if (isUrl) {
      console.log('🌐 [OnboardingChat] URL detected - will trigger website analysis');
      setIsAnalyzingWebsite(true);
      setLoadingMessage('Analyzing your website...');
    } else {
      setIsAnalyzingWebsite(false);
      setLoadingMessage('Thinking...');
    }

    const startTime = Date.now();
    try {
      // Send message to API
      console.log('📤 [OnboardingChat] Sending request to /api/onboarding/chat...');
      const response = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessage
        })
      });

      const duration = Date.now() - startTime;
      console.log(`📥 [OnboardingChat] Response received after ${duration}ms`);
      console.log('📥 [OnboardingChat] Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [OnboardingChat] Request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [OnboardingChat] Data received:', {
        messageLength: data.message?.length,
        toolCallsCount: data.toolCalls?.length || 0,
        interactionsCount: data.session?.interactions?.length || 0
      });

      // Update interactions with real data from server
      setInteractions(data.session.interactions);

      // Notify parent of session update
      if (onSessionUpdate) {
        onSessionUpdate(data.session);
      }
      
      console.log('💬 [OnboardingChat] ========================================\n');

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [OnboardingChat] Error after ${duration}ms:`, error);
      console.error('❌ [OnboardingChat] Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ [OnboardingChat] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.log('💬 [OnboardingChat] ========================================\n');
      
      // Add error message
      const errorInteraction: OnboardingInteraction = {
        id: `error-${Date.now()}`,
        onboardingSessionId: session.id,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: Date.now()
      };
      setInteractions(prev => [...prev, errorInteraction]);
    } finally {
      setIsLoading(false);
      setIsAnalyzingWebsite(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {interactions.map((interaction) => (
          <div
            key={interaction.id}
            className={`flex ${interaction.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] ${
                interaction.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <CardContent className="p-3">
                <div className="text-sm whitespace-pre-wrap">{interaction.content}</div>
                {interaction.metadata?.toolCalls && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="text-xs opacity-70">
                      Tools used: {interaction.metadata.toolCalls.map(tc => tc.name).join(', ')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start w-full">
            {isAnalyzingWebsite ? (
              <div className="w-full">
                <ScrapingProgress 
                  sessionId={session.id}
                  onComplete={(result) => {
                    console.log('✅ [OnboardingChat] Scraping completed:', result);
                    setIsAnalyzingWebsite(false);
                  }}
                  onError={(error) => {
                    // Only log timeout errors, don't show to user if system recovered
                    console.warn('⚠️ [OnboardingChat] Scraping timeout (may have recovered):', error);
                    setIsAnalyzingWebsite(false);
                  }}
                />
              </div>
            ) : (
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{loadingMessage}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
