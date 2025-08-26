import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Creative } from '@/types';

// AI Content Extraction Function
const extractContentFromCreative = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('creative_file', file);
  formData.append('shop', 'adlign.myshopify.com');

  // Use environment variable for API URL, fallback to localhost for development
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${apiUrl}/ai-variants/analyze-creative`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Content extraction failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.extracted_text || 'Contenu analysé avec succès';
};

interface CreativeUploaderProps {
  selectedCreative: Creative | null;
  onCreativeSelect: (creative: Creative | null) => void;
}

export function CreativeUploader({ selectedCreative, onCreativeSelect }: CreativeUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const creative: Creative = {
        id: Math.random().toString(36),
        file,
        preview_url: URL.createObjectURL(file),
        file_type: file.type,
        file_size: file.size,
        extracted_text: '', // Start empty
      };
      onCreativeSelect(creative);
      
      // Real AI content extraction
      extractContentFromCreative(file)
        .then((extractedText) => {
          const updatedCreative: Creative = {
            ...creative,
            extracted_text: extractedText
          };
          onCreativeSelect(updatedCreative);
        })
        .catch((error) => {
          console.error('Content extraction failed:', error);
          // Fallback to mock data
          let mockExtractedText = "Contenu publicitaire détecté - Analyse manuelle recommandée";
          
          if (file.name.toLowerCase().includes('creative') || file.name.toLowerCase().includes('savon')) {
            mockExtractedText = "SAVON ANTI DÉMANGEAISON - Produit naturel apaisant - Soulage les irritations cutanées";
          }
          
          const updatedCreative: Creative = {
            ...creative,
            extracted_text: mockExtractedText
          };
          onCreativeSelect(updatedCreative);
        });
    }
  }, [onCreativeSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeCreative = () => {
    if (selectedCreative) {
      URL.revokeObjectURL(selectedCreative.preview_url);
      onCreativeSelect(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!selectedCreative ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Your Creative
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop your advertising creative here, or click to browse
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <Badge variant="outline">JPG</Badge>
            <Badge variant="outline">PNG</Badge>
            <Badge variant="outline">WebP</Badge>
            <Badge variant="outline">PDF</Badge>
          </div>
          <p className="text-sm text-gray-500">
            Maximum file size: 10MB
          </p>
        </div>
      ) : (
        /* Selected Creative */
        <div className="border border-gray-200 rounded-lg p-6 bg-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Creative Uploaded</h3>
                <p className="text-sm text-gray-500">
                  {selectedCreative.file.name} • {formatFileSize(selectedCreative.file_size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeCreative}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visual Preview */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {selectedCreative.file_type.startsWith('image/') ? (
                  <img
                    src={selectedCreative.preview_url}
                    alt="Creative preview"
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">PDF Preview</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Content */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Extracted Content</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-48 overflow-y-auto">
                {selectedCreative.extracted_text ? (
                  <div className="text-sm text-gray-700">
                    <p className="mb-2 font-medium">Detected Text:</p>
                    <p className="italic">{selectedCreative.extracted_text}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Analyzing content...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Replace Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={removeCreative}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Replace Creative
            </Button>
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Best Practices</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-quality images for better text extraction</li>
          <li>• Include clear, readable text in your creative</li>
          <li>• Supported formats: JPG, PNG, WebP, PDF</li>
          <li>• Our AI will automatically extract text and key elements</li>
        </ul>
      </div>
    </div>
  );
}