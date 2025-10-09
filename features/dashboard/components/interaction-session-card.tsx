"use client";

import React from "react";
import { Phone, MessageSquare, Clock, Calendar } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithMessages } from "../lib/actions";
import { ChatChannel, ChatSessionStatus } from "@/features/shared/lib/database/types/chat-sessions";
import { DateUtils } from "@/features/shared/utils/date-utils";

interface InteractionSessionCardProps {
  session: SessionWithMessages;
}

const channelIcons: Record<ChatChannel, React.ReactNode> = {
  [ChatChannel.PHONE]: <Phone className="w-4 h-4" />,
  [ChatChannel.WHATSAPP]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.WEBSITE]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.FACEBOOK]: <MessageSquare className="w-4 h-4" />,
  [ChatChannel.EMAIL]: <MessageSquare className="w-4 h-4" />,
};

const getStatusStyle = (status: ChatSessionStatus) => {
  switch (status) {
    case ChatSessionStatus.ACTIVE:
      return "bg-primary text-primary-foreground";
    case ChatSessionStatus.ENDED:
      return "bg-muted text-muted-foreground";
    case ChatSessionStatus.PAUSED:
      return "bg-secondary text-secondary-foreground";
    case ChatSessionStatus.TRANSFERRED:
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const channelLabels: Record<ChatChannel, string> = {
  [ChatChannel.PHONE]: "Phone Call",
  [ChatChannel.WHATSAPP]: "WhatsApp",
  [ChatChannel.WEBSITE]: "Website Chat",
  [ChatChannel.FACEBOOK]: "Facebook",
  [ChatChannel.EMAIL]: "Email",
};

export function InteractionSessionCard({ session }: InteractionSessionCardProps) {
  const formatDateTime = (utcIsoString: string | undefined) => {
    if (!utcIsoString) return { date: '', time: '' };
    try {
      const { date, time } = DateUtils.convertUTCToTimezone(utcIsoString, 'Australia/Melbourne');
      const formattedDate = DateUtils.formatDateForDisplay(date);
      const formattedTime = DateUtils.formatTimeForDisplay(time);
      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      console.error('Error formatting date/time:', error);
      const fallbackDate = new Date(utcIsoString);
      return {
        date: fallbackDate.toLocaleDateString(),
        time: fallbackDate.toLocaleTimeString()
      };
    }
  };

  const getDuration = () => {
    const endedAt = session.ended_at;
    const createdAt = session.created_at;
    if (!endedAt || !createdAt) return "Ongoing";
    
    const totalMinutes = DateUtils.diffMinutesUTC(createdAt, endedAt);
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.floor((totalMinutes * 60) % 60);
    return `${minutes}m ${seconds}s`;
  };

  const { date: startDateFormatted, time: startTimeFormatted } = formatDateTime(session.created_at);

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
            <Badge className={getStatusStyle(session.status)}>
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
            <span>{startDateFormatted}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{startTimeFormatted}</span>
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
