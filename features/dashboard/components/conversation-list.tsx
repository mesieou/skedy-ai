"use client";

import { MessageSquare, Phone, Globe } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithInteractions } from "../lib/actions";
import { ChatChannel, ChatSessionStatus } from "@/features/shared/lib/database/types/chat-sessions";

interface ConversationListProps {
  sessions: SessionWithInteractions[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

const channelIcons = {
  [ChatChannel.PHONE]: Phone,
  [ChatChannel.WHATSAPP]: MessageSquare,
  [ChatChannel.WEBSITE]: Globe,
};

const channelColors = {
  [ChatChannel.PHONE]: "bg-blue-500",
  [ChatChannel.WHATSAPP]: "bg-green-500",
  [ChatChannel.WEBSITE]: "bg-purple-500",
};

const statusColors = {
  [ChatSessionStatus.ACTIVE]: "bg-green-500",
  [ChatSessionStatus.ENDED]: "bg-gray-500",
};

export function ConversationList({ sessions, selectedSessionId, onSelectSession }: ConversationListProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getDuration = (session: SessionWithInteractions) => {
    if (!session.ended_at) return "Active";
    
    const start = new Date(session.created_at);
    const end = new Date(session.ended_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    
    if (minutes < 1) return "< 1 min";
    return `${minutes} min`;
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
                <div className={`${channelColors[session.channel]} p-2 rounded-full`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm capitalize">
                        {session.channel} Conversation
                      </h3>
                      <Badge
                        className={`${statusColors[session.status]} text-white text-xs px-2 py-0`}
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
