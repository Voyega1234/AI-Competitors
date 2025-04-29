import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedConcept: any; // Replace with proper type
  onGenerateImage: (referenceImages: File[]) => Promise<void>;
  isGenerating: boolean;
  generatedImageUrl: string | null;
  error: string | null;
}

export function ImageGenerationDialog({
  isOpen,
  onClose,
  selectedConcept,
  onGenerateImage,
  isGenerating,
  generatedImageUrl,
  error,
}: ImageGenerationDialogProps) {
  const [referenceImages, setReferenceImages] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setReferenceImages(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 5,
  });

  const handleGenerateImage = async () => {
    if (referenceImages.length === 0) return;
    await onGenerateImage(referenceImages);
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Image with References</DialogTitle>
          <DialogDescription>
            Upload reference images to generate a new image based on the selected concept: {selectedConcept?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'}`}
          >
            <input {...getInputProps()} />
            <p>Drag & drop reference images here, or click to select files</p>
            <p className="text-sm text-gray-500">Supported formats: PNG, JPG, JPEG</p>
          </div>

          {referenceImages.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {referenceImages.map((file, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {generatedImageUrl && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Generated Image:</h3>
              <div className="relative w-full h-64">
                <Image
                  src={generatedImageUrl}
                  alt="Generated image"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-500 mt-2">
              Error: {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateImage}
            disabled={referenceImages.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Image'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 