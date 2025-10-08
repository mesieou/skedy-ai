"use client";

import { useState } from "react";
import { Calendar, FileText } from "lucide-react";
import type { User } from "@/features/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/shared/components/ui/tabs";
import { Card } from "@/features/shared/components/ui/card";
import { WeeklyCalendar } from "./weekly-calendar";
import { ConversationList } from "./conversation-list";
import { ConversationDetail } from "./conversation-detail";
import type { BookingWithServices, SessionWithInteractions } from "../lib/actions";

interface DashboardTabsProps {
  user: User;
  bookings: BookingWithServices[];
  sessions: SessionWithInteractions[];
}

export function DashboardTabs({ user, bookings, sessions }: DashboardTabsProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Manage your bookings and conversations
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger value="transcription" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Conversations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            {bookings.length > 0 ? (
              <WeeklyCalendar bookings={bookings} />
            ) : (
              <Card className="p-6">
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold">Your Bookings</h2>
                  <p className="text-muted-foreground">
                    View and manage your scheduled appointments
                  </p>
                  <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No bookings yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your upcoming appointments will appear here
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transcription" className="space-y-4">
            {selectedSession ? (
              <ConversationDetail 
                session={selectedSession} 
                onBack={() => setSelectedSessionId(null)} 
              />
            ) : (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Your Conversations</h2>
                <ConversationList
                  sessions={sessions}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}