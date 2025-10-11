"use client";

import React from "react";
import { ArrowLeft, Phone, Globe, MessageSquare, User, Bot, ThumbsUp, ThumbsDown, MessageCircle, X, Mail, Facebook } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithInteractions } from "../lib/actions";
import { InteractionMessage } from "./interaction-message";
import { ChatChannel, ChatSessionStatus, MessageSenderType } from "@/features/shared/lib/database/types/chat-sessions";
import { useEffect, useState } from "react";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";
import { DateUtils } from "@/features/shared/utils/date-utils";

interface ConversationDetailProps {
  session: SessionWithInteractions;
  onBack: () => void;
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

export function ConversationDetail({ session, onBack }: ConversationDetailProps) {
  const Icon = channelIcons[session.channel as keyof typeof channelIcons];
  
  const formatDateTime = (utcIsoString: string) => {
    try {
      const { date, time } = DateUtils.convertUTCToTimezone(utcIsoString, 'Australia/Melbourne');
      const formattedDate = DateUtils.formatDateForDisplay(date);
      const formattedTime = DateUtils.formatTimeForDisplay(time);
      return `${formattedDate} at ${formattedTime}`;
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return new Date(utcIsoString).toLocaleString();
    }
  };

  const getDuration = () => {
    const endedAt = session.ended_at;
    if (!endedAt || !session.created_at) return "Active conversation";
    
    const totalMinutes = DateUtils.diffMinutesUTC(session.created_at, endedAt);
    const minutes = Math.floor(totalMinutes);
    const seconds = Math.floor((totalMinutes * 60) % 60);
    
    return `${minutes}m ${seconds}s`;
  };

  const interactions = session.interactions || [];

  const handleFeedback = async (interactionId: string, isPositive: boolean, comment?: string) => {
    try {
      const { updateInteractionFeedback } = await import("../lib/actions");
      await updateInteractionFeedback(interactionId, isPositive, comment);
      console.log('Feedback saved successfully');
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <div className={`${getChannelStyle(session.channel)} p-3 rounded-full`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold capitalize">{session.channel} Conversation</h2>
            <p className="text-sm text-muted-foreground">
              {session.created_at && formatDateTime(session.created_at)} • {getDuration()}
            </p>
          </div>
        </div>
      </div>

      {/* Interactions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Conversation</h3>
        <div className="space-y-4">
          {interactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No messages in this conversation</p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <InteractionMessage
                key={interaction.id}
                interaction={interaction}
                onFeedback={handleFeedback}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
