import React from 'react';
import { Calendar, Zap, DollarSign, MapPin, Sparkles } from 'lucide-react';

interface ToolIndicatorProps {
  toolName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ToolIndicator({ toolName, size = 'md' }: ToolIndicatorProps) {
  const getToolIcon = (toolName?: string) => {
    const iconClass = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';

    switch (toolName) {
      case 'checkDayAvailability':
        return <Calendar className={`${iconClass} text-white`} />;
      case 'createBooking':
        return <Zap className={`${iconClass} text-white`} />;
      case 'getQuote':
        return <DollarSign className={`${iconClass} text-white`} />;
      case 'getServiceDetails':
        return <MapPin className={`${iconClass} text-white`} />;
      default:
        return <Sparkles className={`${iconClass} text-white`} />;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'p-2';
      case 'lg': return 'p-4';
      default: return 'p-2.5';
    }
  };

  return (
    <div className={`${getSizeClasses()} bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl shadow-lg`}>
      {getToolIcon(toolName)}
    </div>
  );
}
