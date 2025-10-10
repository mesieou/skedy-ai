"use client";

import React, { useState, useMemo } from "react";
import { MessageSquare, Phone, Globe, Mail, Facebook, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { Button } from "@/features/shared/components/ui/button";
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
  [ChatChannel.FACEBOOK]: Facebook,
  [ChatChannel.EMAIL]: Mail,
} as const satisfies Record<ChatChannel, React.ComponentType<any>>;

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

const ITEMS_PER_PAGE = 10;

export function ConversationsList({ sessions, selectedSessionId, onSelectSession }: ConversationsListProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sessions.slice(startIndex, endIndex);
  }, [sessions, currentPage]);

  // Reset to page 1 if current page exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

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
    <div className="space-y-4">
      <div className="space-y-2">
        {sessions.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No conversations yet</p>
          </Card>
        ) : (
          paginatedSessions.map((session) => {
          const Icon = channelIcons[session.channel as keyof typeof channelIcons];
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
                      {session.created_at ? formatDate(session.created_at) : 'N/A'}
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

      {/* Pagination Controls */}
      {sessions.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sessions.length)} of {sessions.length} conversations
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                const showPage = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                const showEllipsis = 
                  (page === currentPage - 2 && currentPage > 3) ||
                  (page === currentPage + 2 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return <span key={page} className="px-2 text-muted-foreground">...</span>;
                }

                if (!showPage) return null;

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="min-w-[2.5rem]"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
