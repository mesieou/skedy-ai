"use client";

interface ChatStatusIndicatorProps {
  status: 'connecting' | 'connected' | 'disconnected';
  businessType: string;
}

export function ChatStatusIndicator({ status, businessType }: ChatStatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
      <div>
        <h2 className="text-xl font-semibold">{businessType} AI Assistant</h2>
        <p className="text-sm text-muted-foreground">{getStatusText()}</p>
      </div>
    </div>
  );
}
