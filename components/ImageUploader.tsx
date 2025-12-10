import React, { useCallback, useState } from 'react';
import { Upload, Camera, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.match('image.*')) {
      alert("Please upload a valid image file (JPEG, PNG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelected(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out flex flex-col items-center justify-center gap-4
        ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:bg-slate-50'}
        ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleChange}
        disabled={isLoading}
      />
      
      <div className="flex flex-col items-center text-slate-500">
        <div className="bg-slate-100 p-4 rounded-full mb-3">
          <Upload className="w-8 h-8 text-brand-500" />
        </div>
        <p className="font-medium text-lg text-slate-700">Click to Upload or Drag Image</p>
        <p className="text-sm text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
      </div>

      <div className="flex gap-2 z-20 pointer-events-none">
        <span className="flex items-center text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
          <ImageIcon size={14} className="mr-1" /> File
        </span>
        <span className="flex items-center text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">
          <Camera size={14} className="mr-1" /> Mobile Camera
        </span>
      </div>
    </div>
  );
};

export default ImageUploader;