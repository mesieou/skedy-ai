"use client";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isAiTyping: boolean;
}

export function ChatMessages({ messages, isAiTyping }: ChatMessagesProps) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'user'
                ? 'bg-primary text-primary-foreground'
                : message.type === 'ai'
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-muted text-muted-foreground text-center'
            }`}
          >
            <p className="text-sm">{message.content}</p>
            <p className="text-xs opacity-70 mt-1">
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}

      {isAiTyping && (
        <div className="flex justify-start">
          <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
