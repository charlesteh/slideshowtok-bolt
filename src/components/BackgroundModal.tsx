import React, { useState } from 'react';
import { X, Upload, Link, Image as ImageIcon } from 'lucide-react';
import { useSlideContext } from '../context/SlideContext';
import { convertToBase64, loadImageFromUrl } from '../utils/fabricUtils';

interface BackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackgroundModal: React.FC<BackgroundModalProps> = ({ isOpen, onClose }) => {
  const { getCurrentSlide, updateSlideBackground } = useSlideContext();
  const [imageUrl, setImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentSlide = getCurrentSlide();

  if (!isOpen || !currentSlide) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setError('');
      const base64 = await convertToBase64(file);
      
      updateSlideBackground(currentSlide.id, {
        type: 'image',
        value: base64
      });
      
      onClose();
    } catch (err) {
      setError('Failed to process image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const base64 = await loadImageFromUrl(imageUrl);
      
      updateSlideBackground(currentSlide.id, {
        type: 'image',
        value: base64
      });
      
      onClose();
    } catch (err) {
      setError('Failed to load image from URL. Make sure the URL is accessible and is an image.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Change Background</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          {/* Upload from device */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Upload from your device</h4>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="mb-2 text-gray-500" />
                <p className="mb-1 text-sm text-gray-500">Click to upload</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleUpload}
                disabled={isLoading}
              />
            </label>
          </div>
          
          {/* From URL */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add from URL</h4>
            <form onSubmit={handleUrlSubmit}>
              <div className="flex">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Link size={16} className="text-gray-500" />
                  </div>
                  <input
                    type="url"
                    className="block w-full p-2.5 pl-10 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="submit"
                  className="p-2.5 ml-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 disabled:bg-blue-400"
                  disabled={isLoading}
                >
                  <ImageIcon size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackgroundModal;