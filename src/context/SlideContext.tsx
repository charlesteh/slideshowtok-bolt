import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { SlideType, AspectRatioType, OverlayType } from '../types';
import { ASPECT_RATIOS, DEFAULT_BACKGROUND, DEFAULT_TEXT, DEFAULT_TEXT_STYLE } from '../constants';

interface SlideContextType {
  slides: SlideType[];
  currentSlideIndex: number;
  setCurrentSlideIndex: (index: number) => void;
  addSlide: () => void;
  deleteSlide: (slideId: string) => void;
  updateSlideBackground: (slideId: string, background: SlideType['background']) => void;
  updateSlideAspectRatio: (slideId: string, aspectRatio: AspectRatioType) => void;
  addOverlay: (slideId: string, overlay: Omit<OverlayType, 'id'>) => void;
  updateOverlay: (slideId: string, overlayId: string, newData: Partial<OverlayType['data']>) => void;
  deleteOverlay: (slideId: string, overlayId: string) => void;
  getCurrentSlide: () => SlideType | undefined;
}

const SlideContext = createContext<SlideContextType | undefined>(undefined);

export const useSlideContext = () => {
  const context = useContext(SlideContext);
  if (!context) {
    throw new Error('useSlideContext must be used within a SlideProvider');
  }
  return context;
};

interface SlideProviderProps {
  children: ReactNode;
}

export const SlideProvider: React.FC<SlideProviderProps> = ({ children }) => {
  const [slides, setSlides] = useState<SlideType[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Initialize with one default slide if no slides exist
    if (slides.length === 0) {
      const aspectRatio = '4:5';
      const config = ASPECT_RATIOS[aspectRatio];
      const backgroundUrl = `${DEFAULT_BACKGROUND}&w=${config.width}&h=${config.height}`;
      setSlides([createDefaultSlide(backgroundUrl, aspectRatio)]);
    }
  }, []);

  const createDefaultSlide = (backgroundUrl: string, aspectRatio: AspectRatioType): SlideType => {
    const config = ASPECT_RATIOS[aspectRatio];
    return {
      id: uuidv4(),
      background: {
        type: 'image',
        value: backgroundUrl
      },
      aspectRatio,
      overlays: [createDefaultTextOverlay(config.width, config.height)]
    };
  };

  const createDefaultTextOverlay = (width: number, height: number): OverlayType => {
    return {
      id: uuidv4(),
      type: 'text',
      data: {
        text: DEFAULT_TEXT,
        ...DEFAULT_TEXT_STYLE,
        width: 200,
        height: 50
      },
      position: {
        x: width / 2,
        y: height / 2
      }
    };
  };

  const addSlide = () => {
    const aspectRatio = '4:5';
    const config = ASPECT_RATIOS[aspectRatio];
    const backgroundUrl = `${DEFAULT_BACKGROUND}&w=${config.width}&h=${config.height}`;
    const newSlide = createDefaultSlide(backgroundUrl, aspectRatio);
    setSlides([...slides, newSlide]);
    setCurrentSlideIndex(slides.length);
  };

  const deleteSlide = (slideId: string) => {
    if (slides.length <= 1) return; // Don't delete the last slide
    
    const index = slides.findIndex(slide => slide.id === slideId);
    if (index !== -1) {
      const newSlides = slides.filter(slide => slide.id !== slideId);
      setSlides(newSlides);
      
      // Adjust current slide index if necessary
      if (index <= currentSlideIndex) {
        setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
      }
    }
  };

  const updateSlideBackground = (slideId: string, background: SlideType['background']) => {
    setSlides(slides.map(slide => 
      slide.id === slideId ? { ...slide, background } : slide
    ));
  };

  const updateSlideAspectRatio = (slideId: string, aspectRatio: AspectRatioType) => {
    setSlides(slides.map(slide => 
      slide.id === slideId ? { ...slide, aspectRatio } : slide
    ));
  };

  const addOverlay = (slideId: string, overlay: Omit<OverlayType, 'id'>) => {
    const newOverlay: OverlayType = {
      ...overlay,
      id: uuidv4()
    };
    
    setSlides(slides.map(slide => 
      slide.id === slideId 
        ? { ...slide, overlays: [...slide.overlays, newOverlay] } 
        : slide
    ));
  };

  const updateOverlay = (slideId: string, overlayId: string, newData: Partial<OverlayType['data']>) => {
    setSlides(slides.map(slide => {
      if (slide.id !== slideId) return slide;
      
      return {
        ...slide,
        overlays: slide.overlays.map(overlay => {
          if (overlay.id !== overlayId) return overlay;
          
          // Handle position separately if it exists in newData
          const position = newData.position 
            ? { ...overlay.position, ...newData.position } 
            : overlay.position;
          
          // Remove position from newData to avoid duplication
          const { position: _, ...restData } = newData;
          
          return {
            ...overlay,
            position,
            data: {
              ...overlay.data,
              ...restData
            }
          };
        })
      };
    }));
  };

  const deleteOverlay = (slideId: string, overlayId: string) => {
    setSlides(slides.map(slide => {
      if (slide.id !== slideId) return slide;
      
      return {
        ...slide,
        overlays: slide.overlays.filter(overlay => overlay.id !== overlayId)
      };
    }));
  };

  const getCurrentSlide = (): SlideType | undefined => {
    return slides[currentSlideIndex];
  };

  const value: SlideContextType = {
    slides,
    currentSlideIndex,
    setCurrentSlideIndex,
    addSlide,
    deleteSlide,
    updateSlideBackground,
    updateSlideAspectRatio,
    addOverlay,
    updateOverlay,
    deleteOverlay,
    getCurrentSlide
  };

  return (
    <SlideContext.Provider value={value}>
      {children}
    </SlideContext.Provider>
  );
};