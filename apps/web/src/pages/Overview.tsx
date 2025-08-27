import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Overview() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h1>
            <p className="text-gray-600 mt-1">
              Analytics will appear here once variants have traffic.
            </p>
          </div>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link to="/variants/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Variant
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          Data will be available once your store generates activity.
        </CardContent>
      </Card>
    </div>
  );
}
