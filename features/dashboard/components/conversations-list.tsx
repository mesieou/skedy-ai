"use client";

import { MessageSquare, Phone, Globe } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithInteractions } from "../lib/actions";
import { ChatChannel, ChatSessionStatus } from "@/features/shared/lib/database/types/chat-sessions";
import { DateUtils } from "@/features/shared/utils/date-utils";

interface ConversationsListProps {
  sessions: SessionWithInteractions[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

const channelIcons = {
  [ChatChannel.PHONE]: Phone,
  [ChatChannel.WHATSAPP]: MessageSquare,
  [ChatChannel.WEBSITE]: Globe,
};

const getChannelStyle = (channel: ChatChannel) => {
  switch (channel) {
    case ChatChannel.PHONE:
      return "bg-primary text-primary-foreground";
    case ChatChannel.WHATSAPP:
      return "bg-accent text-accent-foreground";
    case ChatChannel.WEBSITE:
      return "bg-secondary text-secondary-foreground";
    case ChatChannel.FACEBOOK:
      return "bg-chart-1 text-primary-foreground";
    case ChatChannel.EMAIL:
    default:
      return "bg-muted text-muted-foreground";
  }
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

export function ConversationsList({ sessions, selectedSessionId, onSelectSession }: ConversationsListProps) {
  const formatDate = (dateStr: string) => {
    try {
      const now = DateUtils.nowUTC();
      const diffInHours = DateUtils.diffHoursUTC(dateStr, now);
      
      if (diffInHours < 24) {
        const { time } = DateUtils.convertUTCToTimezone(dateStr, 'Australia/Melbourne');
        return DateUtils.formatTimeForDisplay(time);
      } else if (diffInHours < 48) {
        return "Yesterday";
      } else {
        const { date } = DateUtils.convertUTCToTimezone(dateStr, 'Australia/Melbourne');
        const dt = new Date(date);
        return dt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date(dateStr).toLocaleDateString();
    }
  };

  const getDuration = (session: SessionWithInteractions) => {
    const endedAt = session.ended_at;
    const createdAt = session.created_at;
    if (!endedAt || !createdAt) return "Active";
    
    const minutes = DateUtils.diffMinutesUTC(createdAt, endedAt);
    
    if (minutes < 1) return "< 1 min";
    return `${Math.floor(minutes)} min`;
  };

  return (
    <div className="space-y-2">
      {sessions.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No conversations yet</p>
        </Card>
      ) : (
        sessions.map((session) => {
          const Icon = channelIcons[session.channel];
          const isSelected = session.id === selectedSessionId;
          const messageCount = session.interactions?.length || 0;

          return (
            <Card
              key={session.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary bg-muted/50" : ""
              }`}
              onClick={() => onSelectSession(session.id)}
            >
              <div className="flex items-start gap-3">
                {/* Channel Icon */}
                <div className={`${getChannelStyle(session.channel)} p-2 rounded-full`}>
                  <Icon className="w-4 h-4" />
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm capitalize">
                        {session.channel} Conversation
                      </h3>
                      <Badge
                        className={`${getStatusStyle(session.status)} text-xs px-2 py-0`}
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(session.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {messageCount} {messageCount === 1 ? "message" : "messages"} • {getDuration(session)}
                    </p>
                    {session.token_spent && (
                      <span className="text-xs font-medium text-muted-foreground">
                        ${session.token_spent.totalCost?.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
