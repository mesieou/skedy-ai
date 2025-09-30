import { CheckCircle, Mail, Clock } from "lucide-react";
import type { User } from "@/features/auth";

interface DashboardWelcomeProps {
  user: User;
}

export function DashboardWelcome({ user }: DashboardWelcomeProps) {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <Mail className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Welcome to Skedy AI!
          </h1>
          <p className="text-lg text-muted-foreground">
            Thanks for joining the waitlist, {user.email?.split('@')[0]}!
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
            <span className="font-medium">You&apos;re on the waitlist</span>
          </div>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              We&apos;ll contact you shortly with early access to Skedy AI&apos;s powerful scheduling features.
            </p>
            <p>
              Keep an eye on your inbox - exciting updates are coming your way!
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            Your account is active and ready for when we launch.
          </p>
          <p className="font-mono bg-muted px-2 py-1 rounded text-[10px] sm:text-xs break-all">
            {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
