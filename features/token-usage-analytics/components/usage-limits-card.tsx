import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface UsageLimitsCardProps {
  title: string;
  data: {
    tpmWarning?: boolean;
    rpmWarning?: boolean;
    costWarning?: boolean;
    percentages?: {
      tpm: number;
      rpm: number;
      cost: number;
    };
  } | null;
}

export function UsageLimitsCard({ title, data }: UsageLimitsCardProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No limit data available</div>
        </CardContent>
      </Card>
    );
  }

  const hasWarnings = data.tpmWarning || data.rpmWarning || data.costWarning;
  const warningCount = [data.tpmWarning, data.rpmWarning, data.costWarning].filter(Boolean).length;

  const getIcon = () => {
    if (hasWarnings) {
      return warningCount > 1 ? (
        <AlertTriangle className="h-4 w-4 text-destructive" />
      ) : (
        <AlertCircle className="h-4 w-4 text-yellow-500" />
      );
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (!hasWarnings) return "All limits healthy";
    if (warningCount === 1) return "1 limit approaching";
    return `${warningCount} limits approaching`;
  };

  const getVariant = () => {
    if (!hasWarnings) return "secondary";
    if (warningCount > 1) return "destructive";
    return "default";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getIcon()}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center">
          <Badge variant={getVariant()}>
            {getStatusText()}
          </Badge>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>TPM Usage:</span>
            <div className="flex items-center gap-2">
              <span>{data.percentages?.tpm || 0}%</span>
              {data.tpmWarning && <AlertTriangle className="h-3 w-3 text-destructive" />}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span>RPM Usage:</span>
            <div className="flex items-center gap-2">
              <span>{data.percentages?.rpm || 0}%</span>
              {data.rpmWarning && <AlertTriangle className="h-3 w-3 text-destructive" />}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span>Cost Usage:</span>
            <div className="flex items-center gap-2">
              <span>{data.percentages?.cost || 0}%</span>
              {data.costWarning && <AlertTriangle className="h-3 w-3 text-destructive" />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
