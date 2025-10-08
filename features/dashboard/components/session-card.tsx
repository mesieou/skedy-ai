"use client";

import { Phone, MessageSquare, Clock, Calendar } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithMessages } from "../lib/actions";
import { ChatChannel, ChatSessionStatus } from "@/features/shared/lib/database/types/chat-sessions";

interface SessionCardProps {
  session: SessionWithMessages;
}

const channelIcons: Record<ChatChannel, React.ReactNode> = {
  [ChatChannel.PHONE]: <Phone className="w-4 h-4" />,
  [ChatChannel.WHATSAPP]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.WEBSITE]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.FACEBOOK]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.EMAIL]: <MessageSquare className="w-4 h-4" />,
};

const statusColors: Record<ChatSessionStatus, string> = {
  [ChatSessionStatus.ACTIVE]: "bg-green-500",
  [ChatSessionStatus.ENDED]: "bg-gray-500",
  [ChatSessionStatus.PAUSED]: "bg-yellow-500",
  [ChatSessionStatus.TRANSFERRED]: "bg-blue-500",
};

const channelLabels: Record<ChatChannel, string> = {
  [ChatChannel.PHONE]: "Phone Call",
  [ChatChannel.WHATSAPP]: "WhatsApp",
  [ChatChannel.WEBSITE]: "Website Chat",
  [ChatChannel.FACEBOOK]: "Facebook",
  [ChatChannel.EMAIL]: "Email",
};

export function SessionCard({ session }: SessionCardProps) {
  const startDate = new Date(session.created_at);
  const endDate = session.ended_at ? new Date(session.ended_at) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDuration = () => {
    if (!endDate) return "Ongoing";
    const durationMs = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="space-y-4">
        {/* Header with channel and status */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {channelIcons[session.channel]}
              <h3 className="text-lg font-semibold">
                {channelLabels[session.channel]}
              </h3>
            </div>
            <Badge className={`${statusColors[session.status]} text-white`}>
              {session.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              {session.messageCount} messages
            </p>
            {session.token_spent && (
              <p className="text-xs text-muted-foreground mt-1">
                Cost: ${session.token_spent.totalCost.toFixed(4)}
              </p>
            )}
          </div>
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{formatTime(startDate)}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Duration: {getDuration()}</span>
        </div>

        {/* Last Message Preview */}
        {session.lastMessage && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Last Message:</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {session.lastMessage.content}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              From: {session.lastMessage.sender_type}
            </p>
          </div>
        )}

        {/* Token Usage Details */}
        {session.token_spent && (
          <div className="pt-4 border-t space-y-1">
            <p className="text-sm font-medium">Token Usage:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Input: {session.token_spent.inputTokens.toLocaleString()}</div>
              <div>Output: {session.token_spent.outputTokens.toLocaleString()}</div>
              {session.token_spent.audioInputTokens > 0 && (
                <div>Audio In: {session.token_spent.audioInputTokens.toLocaleString()}</div>
              )}
              {session.token_spent.audioOutputTokens > 0 && (
                <div>Audio Out: {session.token_spent.audioOutputTokens.toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}