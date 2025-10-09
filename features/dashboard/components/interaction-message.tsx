"use client";

import { useState } from "react";
import { Bot, User, ThumbsUp, ThumbsDown, MessageCircle, X, Check } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import type { Interaction } from "@/features/shared/lib/database/types/interactions";

interface InteractionMessageProps {
  interaction: Interaction;
  onFeedback: (interactionId: string, isPositive: boolean, comment?: string) => void;
}

export function InteractionMessage({ interaction, onFeedback }: InteractionMessageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState(interaction.human_critique || "");
  const [localFeedback, setLocalFeedback] = useState<boolean | null>(
    interaction.human_outcome !== null && interaction.human_outcome !== undefined
      ? interaction.human_outcome
      : null
  );

  const handleThumbsUp = () => {
    setLocalFeedback(true);
    setShowCommentInput(false);
    onFeedback(interaction.id, true);
  };

  const handleThumbsDown = () => {
    setLocalFeedback(false);
    setShowCommentInput(true);
  };

  const handleCommentSubmit = async () => {
    if (comment.trim()) {
      await onFeedback(interaction.id, false, comment);
      // Update local state to show the comment immediately
      interaction.human_critique = comment;
      setShowCommentInput(false);
    }
  };

  const handleCommentCancel = () => {
    setShowCommentInput(false);
    setComment(interaction.human_critique || "");
    if (localFeedback === false && !interaction.human_critique) {
      setLocalFeedback(null);
    }
  };

  const formatTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Customer input message (if exists)
  const customerMessage = interaction.customer_input ? (
    <div className="flex gap-3 flex-row-reverse mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
        <User className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 max-w-[70%] flex flex-col items-end">
        <div className="rounded-lg px-4 py-2 bg-primary text-primary-foreground">
          <p className="text-sm whitespace-pre-wrap">{interaction.customer_input}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatTime(interaction.created_at)}
        </p>
      </div>
    </div>
  ) : null;

  // AI response message
  return (
    <>
      {customerMessage}
      <div
        className="flex gap-3 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>

        {/* Message Content */}
        <div className="flex-1 max-w-[70%]">
          <div className="rounded-lg px-4 py-2 bg-muted text-foreground relative">
            <p className="text-sm whitespace-pre-wrap">{interaction.model_output}</p>
            
            {/* Feedback Buttons - Show on hover or if feedback exists */}
            {(isHovered || localFeedback !== null) && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${
                    localFeedback === true
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "hover:bg-green-50"
                  }`}
                  onClick={handleThumbsUp}
                >
                  <ThumbsUp className={`w-3 h-3 ${localFeedback === true ? "fill-current" : ""}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${
                    localFeedback === false
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "hover:bg-red-50"
                  }`}
                  onClick={handleThumbsDown}
                >
                  <ThumbsDown className={`w-3 h-3 ${localFeedback === false ? "fill-current" : ""}`} />
                </Button>
                
                {/* Comment Icon - Show if comment exists */}
                {localFeedback === false && interaction.human_critique && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                    onClick={() => setShowCommentInput(!showCommentInput)}
                    title={interaction.human_critique}
                  >
                    <MessageCircle className="w-3 h-3 fill-current" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Comment Input Box */}
          {showCommentInput && (
            <div className="mt-2 p-3 bg-muted rounded-lg border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                What could be improved?
              </p>
              <textarea
                className="w-full p-2 text-sm border border-border rounded resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Add your feedback..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex items-center gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={handleCommentSubmit}
                  disabled={!comment.trim()}
                  className="h-7"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCommentCancel}
                  className="h-7"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(interaction.created_at)}
          </p>
        </div>
      </div>
    </>
  );
}
