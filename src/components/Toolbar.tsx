import React from 'react';
import { Download, Layers } from 'lucide-react';
import { useSlideContext } from '../context/SlideContext';
import { downloadSlides } from '../utils/exportUtils';

const Toolbar: React.FC = () => {
  const { slides } = useSlideContext();
  
  const handleExport = async () => {
    await downloadSlides(slides);
  };
  
  return (
    <div className="flex justify-between items-center p-4 bg-white border-b">
      <div className="flex items-center">
        <Layers size={24} className="text-blue-600 mr-2" />
        <h1 className="text-xl font-semibold">Slideshow Editor</h1>
      </div>
      
      <div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          onClick={handleExport}
        >
          <Download size={16} className="mr-2" />
          Export All Slides
        </button>
      </div>
    </div>
  );
};

export default Toolbar;