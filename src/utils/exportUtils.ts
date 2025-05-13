import Konva from 'konva';
import { SlideType } from '../types';
import { ASPECT_RATIOS } from '../constants';
import { createTextConfig, getCanvasSize } from './konvaUtils';

export const generateSlideThumbnail = async (
  slide: SlideType, 
  width: number = 160, 
  height: number = 90
): Promise<string> => {
  return new Promise((resolve) => {
    // Create a temporary stage and layer
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width,
      height
    });
    
    const layer = new Konva.Layer();
    stage.add(layer);
    
    // Set background
    if (slide.background.type === 'image') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const konvaImage = new Konva.Image({
          image: img,
          width,
          height,
          x: 0,
          y: 0
        });
        
        layer.add(konvaImage);
        
        // Add text overlays (scaled down for thumbnail)
        addTextOverlays(slide, layer, width, height);
        
        // Get thumbnail URL
        layer.draw();
        const dataUrl = stage.toDataURL();
        resolve(dataUrl);
        
        // Clean up
        stage.destroy();
      };
      
      img.src = slide.background.value;
    } else {
      // Color background
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: slide.background.value
      });
      
      layer.add(rect);
      
      // Add text overlays (scaled down for thumbnail)
      addTextOverlays(slide, layer, width, height);
      
      // Get thumbnail URL
      layer.draw();
      const dataUrl = stage.toDataURL();
      resolve(dataUrl);
      
      // Clean up
      stage.destroy();
    }
  });
};

const addTextOverlays = (slide: SlideType, layer: Konva.Layer, width: number, height: number) => {
  const originalSize = getCanvasSize(slide.aspectRatio);
  const scaleX = width / originalSize.width;
  const scaleY = height / originalSize.height;
  
  slide.overlays.forEach(overlay => {
    if (overlay.type === 'text') {
      const textConfig = createTextConfig(overlay);
      
      // Scale position for thumbnail
      const text = new Konva.Text({
        ...textConfig,
        x: textConfig.x * scaleX,
        y: textConfig.y * scaleY,
        fontSize: textConfig.fontSize * Math.min(scaleX, scaleY),
        scaleX: textConfig.scaleX * scaleX,
        scaleY: textConfig.scaleY * scaleY,
        offsetX: textConfig.offsetX * scaleX,
        offsetY: textConfig.offsetY * scaleY,
        draggable: false
      });
      
      layer.add(text);
    }
  });
};

export const exportAllSlides = async (
  slides: SlideType[]
): Promise<Blob[]> => {
  const blobs: Blob[] = [];
  
  for (const slide of slides) {
    const { width, height } = getCanvasSize(slide.aspectRatio);
    
    // Create a temporary stage
    const stage = new Konva.Stage({
      container: document.createElement('div'),
      width,
      height
    });
    
    const layer = new Konva.Layer();
    stage.add(layer);
    
    // Create a promise to handle async background loading
    const slideExport = new Promise<Blob>((resolve) => {
      if (slide.background.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const konvaImage = new Konva.Image({
            image: img,
            width,
            height,
            x: 0,
            y: 0
          });
          
          layer.add(konvaImage);
          
          // Add all text overlays
          slide.overlays.forEach(overlay => {
            if (overlay.type === 'text') {
              const textConfig = createTextConfig(overlay);
              const text = new Konva.Text(textConfig);
              layer.add(text);
            }
          });
          
          layer.draw();
          
          // Convert stage to blob
          stage.toBlob({
            mimeType: 'image/jpeg',
            quality: 0.8,
            callback: (blob) => {
              resolve(blob);
              stage.destroy();
            }
          });
        };
        
        img.onerror = () => {
          resolve(new Blob(['Export failed'], { type: 'text/plain' }));
          stage.destroy();
        };
        
        img.src = slide.background.value;
      } else {
        // Color background
        const rect = new Konva.Rect({
          x: 0,
          y: 0,
          width,
          height,
          fill: slide.background.value
        });
        
        layer.add(rect);
        
        // Add all text overlays
        slide.overlays.forEach(overlay => {
          if (overlay.type === 'text') {
            const textConfig = createTextConfig(overlay);
            const text = new Konva.Text(textConfig);
            layer.add(text);
          }
        });
        
        layer.draw();
        
        // Convert stage to blob
        stage.toBlob({
          mimeType: 'image/jpeg',
          quality: 0.8,
          callback: (blob) => {
            resolve(blob);
            stage.destroy();
          }
        });
      }
    });
    
    blobs.push(await slideExport);
  }
  
  return blobs;
};

export const downloadSlides = async (slides: SlideType[]): Promise<void> => {
  const blobs = await exportAllSlides(slides);
  
  if (blobs.length === 1) {
    // Single slide download
    const url = URL.createObjectURL(blobs[0]);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slide.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // Multiple slides - download individually
    blobs.forEach((blob, index) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
};