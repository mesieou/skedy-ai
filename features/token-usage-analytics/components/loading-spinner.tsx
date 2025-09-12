import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading analytics...</p>
    </div>
  );
}
