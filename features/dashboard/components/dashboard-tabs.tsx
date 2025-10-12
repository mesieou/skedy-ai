"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, FileText } from "lucide-react";
import type { User } from "@/features/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/features/shared/components/ui/tabs";
import { WeeklyCalendar } from "./weekly-calendar";
import { ConversationsList } from "./conversations-list";
import { ConversationDetail } from "./conversation-detail";
import type { BookingWithServices, SessionWithInteractions } from "../lib/actions";

interface DashboardTabsProps {
  user: User;
  bookings: BookingWithServices[];
  sessions: SessionWithInteractions[];
  businessTimezone: string;
}

export function DashboardTabs({ user, bookings, sessions, businessTimezone }: DashboardTabsProps) {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const handleBookingCreated = () => {
    // Refresh the page data to show the new booking
    router.refresh();
  };


  return (
    <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
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

          <TabsContent value="bookings" className="mt-8 space-y-4">
            <WeeklyCalendar bookings={bookings} user={user} businessTimezone={businessTimezone} onBookingCreated={handleBookingCreated} />
          </TabsContent>

          <TabsContent value="transcription" className="mt-8 space-y-4">
            {selectedSession ? (
              <ConversationDetail
                session={selectedSession}
                onBack={() => setSelectedSessionId(null)}
              />
            ) : (
              <ConversationsList
                sessions={sessions}
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
