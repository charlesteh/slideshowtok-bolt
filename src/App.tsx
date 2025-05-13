import React from 'react';
import { SlideProvider } from './context/SlideContext';
import Toolbar from './components/Toolbar';
import SlideCanvas from './components/SlideCanvas';
import SlideControls from './components/SlideControls';
import TextOverlaysList from './components/TextOverlaysList';
import SlideThumbnails from './components/SlideThumbnails';

function App() {
  return (
    <SlideProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Toolbar />
        
        <div className="flex-1 flex flex-col pb-28">
          <div className="flex-1 flex items-center justify-center p-4">
            <SlideCanvas />
          </div>
          
          <div className="flex flex-col items-center">
            <SlideControls />
            <TextOverlaysList />
          </div>
        </div>
        
        <SlideThumbnails />
      </div>
    </SlideProvider>
  );
}

export default App;