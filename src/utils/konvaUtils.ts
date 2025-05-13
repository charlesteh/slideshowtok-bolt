import { SlideType, OverlayType, AspectRatioType } from '../types';
import { ASPECT_RATIOS } from '../constants';

export const getCanvasSize = (aspectRatio: AspectRatioType) => {
  const config = ASPECT_RATIOS[aspectRatio];
  return {
    width: config.width,
    height: config.height
  };
};

export const createTextConfig = (overlay: OverlayType) => {
  const { data, position } = overlay;
  
  // Ensure we have valid values for all properties
  const fontSize = data.fontSize || 36;
  const width = data.width || 200;
  const height = data.height || 50;
  const scaleX = data.scaleX || 1;
  const scaleY = data.scaleY || 1;
  
  return {
    id: overlay.id,
    text: data.text,
    x: position?.x ?? 0,
    y: position?.y ?? 0,
    fontFamily: data.fontFamily,
    fontSize: fontSize,
    fontStyle: data.fontWeight === 'bold' 
      ? (data.fontStyle === 'italic' ? 'bold italic' : 'bold') 
      : (data.fontStyle === 'italic' ? 'italic' : 'normal'),
    align: data.textAlign,
    fill: data.fill,
    stroke: data.stroke,
    strokeWidth: data.strokeWidth,
    rotation: data.angle ?? 0,
    scaleX: scaleX,
    scaleY: scaleY,
    width: width,
    height: height,
    draggable: true,
    perfectDrawEnabled: false,
    transformsEnabled: 'all',
    // Center the text around its position
    offsetX: width / 2,
    offsetY: height / 2,
    // Remove fixed line height
    lineHeight: 1.2
  };
};

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const loadImageFromUrl = async (url: string): Promise<string> => {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    img.onerror = () => {
      reject(new Error('Could not load image'));
    };
    
    img.src = url;
  });
};