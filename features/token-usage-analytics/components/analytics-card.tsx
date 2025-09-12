import { Card, CardContent, CardHeader, CardTitle } from "@/features/shared/components/ui/card";
import { Badge } from "@/features/shared/components/ui/badge";
import { Progress } from "@/features/shared/components/ui/progress";

interface AnalyticsCardProps {
  title: string;
  data: any;
  type?: 'usage' | 'cost' | 'breakdown' | 'list' | 'info';
}

export function AnalyticsCard({ title, data, type = 'info' }: AnalyticsCardProps) {
  const renderContent = () => {
    switch (type) {
      case 'usage':
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Used: {data.used?.toLocaleString() || 0}</span>
              <span>Limit: {data.limit?.toLocaleString() || 0}</span>
            </div>
            <Progress value={data.percentage || 0} className="h-2" />
            <div className="text-center">
              <Badge variant={data.percentage > 80 ? 'destructive' : data.percentage > 60 ? 'default' : 'secondary'}>
                {data.percentage || 0}% used
              </Badge>
            </div>
          </div>
        );

      case 'cost':
        return (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Spent: ${data.used?.toFixed(2) || '0.00'}</span>
              <span>Budget: ${data.limit?.toFixed(2) || '0.00'}</span>
            </div>
            <Progress value={data.percentage || 0} className="h-2" />
            <div className="text-center">
              <Badge variant={data.percentage > 80 ? 'destructive' : data.percentage > 60 ? 'default' : 'secondary'}>
                {data.percentage || 0}% of budget
              </Badge>
            </div>
          </div>
        );

      case 'breakdown':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Cached:</span>
              <span>{data.cached?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Uncached:</span>
              <span>{data.uncached?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Audio In:</span>
              <span>{data.audioInput?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Audio Out:</span>
              <span>{data.audioOutput?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total:</span>
              <span>{data.total?.toLocaleString() || 0}</span>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {data?.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="truncate flex-1">
                  {item.businessName || item.type || item.name || 'Unknown'}
                </span>
                <div className="flex gap-2 text-right">
                  <span>{item.tokens?.toLocaleString() || 0} tokens</span>
                  <span>${item.cost?.toFixed(4) || '0.00'}</span>
                </div>
              </div>
            ))}
            {!data?.length && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No data available
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm space-y-1">
            {typeof data === 'object' ? (
              Object.entries(data).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <span>
                    {key === 'lastUpdated'
                      ? new Date(value as number).toLocaleTimeString()
                      : String(value)
                    }
                  </span>
                </div>
              ))
            ) : (
              <span>{String(data)}</span>
            )}
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
