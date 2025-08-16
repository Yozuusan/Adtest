import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NewVariantFormData } from '@/types';

interface AdditionalContextProps {
  formData: Partial<NewVariantFormData>;
  onFormDataChange: (data: Partial<NewVariantFormData>) => void;
}

export function AdditionalContext({ formData, onFormDataChange }: AdditionalContextProps) {
  const updateFormData = (updates: Partial<NewVariantFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Campaign Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Context <span className="text-gray-400">(Optional)</span>
        </label>
        <Textarea
          placeholder="Add campaign details, promos, special offers, target audience (e.g., young professionals, eco-conscious consumers), tone preferences (urgent, professional, casual), or key messages that should be highlighted in your variant..."
          value={formData.campaign_context || ''}
          onChange={(e) => updateFormData({ campaign_context: e.target.value })}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Provide additional context to help AI create more targeted content. Your creative already contains the main messaging.
        </p>
      </div>

      {/* Variant Handle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Variant Handle <span className="text-gray-400">(Optional)</span>
        </label>
        <Input
          placeholder="e.g., black-friday-urgent, summer-sale-2024..."
          value={formData.variant_handle || ''}
          onChange={(e) => updateFormData({ variant_handle: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">
          URL-friendly identifier for this variant. If empty, we'll generate one automatically.
        </p>
      </div>

      {/* Preview Summary */}
      {formData.campaign_context && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Additional Context</h4>
          <div className="text-sm">
            <div className="flex items-start">
              <span className="text-gray-600 w-20 mt-0.5">Context:</span>
              <span className="text-gray-900 flex-1">
                {formData.campaign_context.substring(0, 200)}
                {formData.campaign_context.length > 200 && '...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your creative is automatically analyzed for text and visual elements</li>
          <li>• AI extracts key messages, offers, and tone from your creative</li>
          <li>• Additional context helps refine the optimization further</li>
          <li>• You can create variants with just Product + Creative - no extra context needed!</li>
        </ul>
      </div>
    </div>
  );
}