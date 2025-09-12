import { Card, CardContent } from "@/features/shared/components/ui/card";
import { Button } from "@/features/shared/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorMessageProps {
  error: string;
  onRetry?: () => void;
}

export function ErrorMessage({ error, onRetry }: ErrorMessageProps) {
  return (
    <Card className="border-destructive">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />

          <div>
            <h3 className="text-lg font-medium">Failed to load analytics</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error}
            </p>
          </div>

          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
