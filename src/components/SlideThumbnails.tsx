import React, { useEffect, useState } from 'react';
import { useSlideContext } from '../context/SlideContext';
import { generateSlideThumbnail } from '../utils/exportUtils';
import { Plus } from 'lucide-react';

const SlideThumbnails: React.FC = () => {
  const { 
    slides, 
    currentSlideIndex, 
    setCurrentSlideIndex, 
    addSlide 
  } = useSlideContext();
  
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  
  useEffect(() => {
    const generateThumbnails = async () => {
      const newThumbnails = await Promise.all(
        slides.map(slide => generateSlideThumbnail(slide))
      );
      setThumbnails(newThumbnails);
    };
    
    generateThumbnails();
  }, [slides]);
  
  const handleSlideSelect = (index: number) => {
    setCurrentSlideIndex(index);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-center space-x-4">
          {thumbnails.map((thumbnail, index) => (
            <button
              key={`slide-${index}`}
              className={`relative group ${
                index === currentSlideIndex 
                  ? 'ring-2 ring-blue-500' 
                  : 'hover:ring-2 hover:ring-blue-300'
              } rounded-md overflow-hidden transition-all duration-150 focus:outline-none`}
              onClick={() => handleSlideSelect(index)}
            >
              <div className="w-24 h-16 bg-gray-100 flex items-center justify-center overflow-hidden">
                <img 
                  src={thumbnail} 
                  alt={`Slide ${index + 1}`} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-40 text-white text-xs py-0.5 px-2">
                {index + 1}
              </div>
            </button>
          ))}
          
          <button
            className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center hover:bg-gray-200 transition-colors"
            onClick={addSlide}
          >
            <Plus size={24} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideThumbnails;