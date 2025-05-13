import React, { useState } from 'react';
import { 
  ImageIcon, 
  Type, 
  Clock,
  Ratio, 
  Trash2, 
  Plus
} from 'lucide-react';
import { useSlideContext } from '../context/SlideContext';
import { AspectRatioType } from '../types';
import { ASPECT_RATIOS } from '../constants';
import BackgroundModal from './BackgroundModal';

const SlideControls: React.FC = () => {
  const { 
    getCurrentSlide, 
    updateSlideAspectRatio, 
    deleteSlide,
    addOverlay
  } = useSlideContext();
  
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isAspectRatioMenuOpen, setIsAspectRatioMenuOpen] = useState(false);
  
  const currentSlide = getCurrentSlide();
  
  if (!currentSlide) return null;
  
  const handleAspectRatioChange = (ratio: AspectRatioType) => {
    updateSlideAspectRatio(currentSlide.id, ratio);
    setIsAspectRatioMenuOpen(false);
  };
  
  const handleAddTextOverlay = () => {
    const aspectRatioConfig = ASPECT_RATIOS[currentSlide.aspectRatio];
    const width = aspectRatioConfig.width * 0.8; // 80% of slide width
    
    addOverlay(currentSlide.id, {
      type: 'text',
      data: {
        text: 'Click to edit text here',
        fontFamily: 'Montserrat',
        fontSize: 36,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'center',
        fill: '#ffffff',
        stroke: '#000000',
        strokeWidth: 0,
        width: width
      },
      position: {
        x: ASPECT_RATIOS[currentSlide.aspectRatio].width / 2,
        y: ASPECT_RATIOS[currentSlide.aspectRatio].height / 2
      }
    });
  };
  
  return (
    <div className="flex justify-center space-x-2 py-3">
      <button 
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        onClick={() => setIsBackgroundModalOpen(true)}
        title="Change background"
      >
        <ImageIcon size={20} />
      </button>
      
      <button 
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        onClick={handleAddTextOverlay}
        title="Add text"
      >
        <Type size={20} />
      </button>
      
      <button 
        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        title="3s (placeholder)"
      >
        <Clock size={20} />
      </button>
      
      <div className="relative">
        <button 
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          onClick={() => setIsAspectRatioMenuOpen(!isAspectRatioMenuOpen)}
          title="Change aspect ratio"
        >
          <Ratio size={20} />
        </button>
        
        {isAspectRatioMenuOpen && (
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-2 z-10">
            <div className="grid grid-cols-2 gap-2 w-48">
              {Object.keys(ASPECT_RATIOS).map((ratio) => (
                <button
                  key={ratio}
                  className={`py-1 px-2 text-sm rounded-md transition-colors ${
                    currentSlide.aspectRatio === ratio 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => handleAspectRatioChange(ratio as AspectRatioType)}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <button 
        className="p-2 rounded-full bg-red-100 hover:bg-red-200 transition-colors text-red-600"
        onClick={() => deleteSlide(currentSlide.id)}
        title="Delete slide"
      >
        <Trash2 size={20} />
      </button>
      
      <BackgroundModal 
        isOpen={isBackgroundModalOpen} 
        onClose={() => setIsBackgroundModalOpen(false)} 
      />
    </div>
  );
};

export default SlideControls;