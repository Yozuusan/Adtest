import { Product, Creative, NewVariantFormData } from '@/types';

interface VariantReviewProps {
  product: Product | null;
  creative: Creative | null;
  formData: Partial<NewVariantFormData>;
  onFormDataChange: (data: Partial<NewVariantFormData>) => void;
}

export function VariantReview({ product, creative, formData, onFormDataChange }: VariantReviewProps) {
  void product;
  void creative;
  void formData;
  void onFormDataChange;
  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Review mapped elements and edit as needed. This placeholder will
        display detected content from your product and creative.
      </p>
    </div>
  );
}
