import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface StatusCardProps {
  title: string;
  data: {
    status?: string;
    accountId?: string;
    timestamp?: string | number;
  } | null;
}

export function StatusCard({ title, data }: StatusCardProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active':
        return 'secondary';
      case 'warning':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp?: string | number) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon(data?.status)}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <Badge variant={getStatusVariant(data?.status)}>
            {data?.status || 'unknown'}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Account:</span>
            <span className="font-mono text-xs">{data?.accountId || 'N/A'}</span>
          </div>

          <div className="flex justify-between">
            <span>Updated:</span>
            <span className="text-xs">{formatTimestamp(data?.timestamp)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
