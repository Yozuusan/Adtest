import { Card, CardContent } from '@/components/ui/card';

export function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">
          Performance insights for your landing page variants
        </p>
      </div>
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Analytics data will appear here once your variants start
          receiving traffic.
        </CardContent>
      </Card>
    </div>
  );
}
