"use client";

import { ArrowLeft, Phone, Globe, MessageSquare, User, Bot, ThumbsUp, ThumbsDown, MessageCircle, X } from "lucide-react";
import { Card } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { Badge } from "@/features/shared/components/ui/badge";
import type { SessionWithInteractions } from "../lib/actions";
import { InteractionMessage } from "./interaction-message";
import { ChatChannel, ChatSessionStatus, MessageSenderType } from "@/features/shared/lib/database/types/chat-sessions";
import { useEffect, useState } from "react";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";

interface ConversationDetailProps {
  session: SessionWithInteractions;
  onBack: () => void;
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

export function ConversationDetail({ session, onBack }: ConversationDetailProps) {
  const Icon = channelIcons[session.channel];
  
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDuration = () => {
    if (!session.ended_at) return "Active conversation";
    
    const start = new Date(session.created_at);
    const end = new Date(session.ended_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
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
          <div className={`${channelColors[session.channel]} p-3 rounded-full`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold capitalize">{session.channel} Conversation</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(session.created_at)} • {getDuration()}
            </p>
          </div>
        </div>
      </div>

      {/* Session Info Card */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge className={session.status === ChatSessionStatus.ACTIVE ? "bg-green-500" : "bg-gray-500"}>
              {session.status}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Interactions</p>
            <p className="font-semibold">{interactions.length}</p>
          </div>
          {session.token_spent && (
            <>
              <div>
                <p className="text-muted-foreground">Tokens Used</p>
                <p className="font-semibold">
                  {(session.token_spent.inputTokens || 0) + (session.token_spent.outputTokens || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost</p>
                <p className="font-semibold">${session.token_spent.totalCost?.toFixed(4)}</p>
              </div>
            </>
          )}
        </div>
      </Card>

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

      {/* Token Usage Details (if available) */}
      {session.token_spent && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Token Usage Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Input Tokens</p>
              <p className="font-semibold">{session.token_spent.inputTokens || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Output Tokens</p>
              <p className="font-semibold">{session.token_spent.outputTokens || 0}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cached Tokens</p>
              <p className="font-semibold">{session.token_spent.cachedTokens || 0}</p>
            </div>
            {session.token_spent.audioInputTokens !== undefined && (
              <>
                <div>
                  <p className="text-muted-foreground">Audio Input</p>
                  <p className="font-semibold">{session.token_spent.audioInputTokens}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Audio Output</p>
                  <p className="font-semibold">{session.token_spent.audioOutputTokens || 0}</p>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
