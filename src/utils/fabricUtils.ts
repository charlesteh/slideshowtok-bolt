import { fabric } from 'fabric';
import { SlideType, OverlayType } from '../types';
import { ASPECT_RATIOS } from '../constants';

export const initCanvas = (
  canvasElement: HTMLCanvasElement, 
  slide: SlideType
): fabric.Canvas => {
  const aspectRatioConfig = ASPECT_RATIOS[slide.aspectRatio];
  
  const canvas = new fabric.Canvas(canvasElement, {
    width: aspectRatioConfig.width,
    height: aspectRatioConfig.height,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true
  });

  return canvas;
};

export const updateCanvasSize = (
  canvas: fabric.Canvas,
  aspectRatio: string
): void => {
  if (!canvas) return;
  
  const aspectRatioConfig = ASPECT_RATIOS[aspectRatio];
  
  canvas.setWidth(aspectRatioConfig.width);
  canvas.setHeight(aspectRatioConfig.height);
  canvas.renderAll();
};

export const setBackgroundImage = (
  canvas: fabric.Canvas,
  imageUrl: string,
  callback?: () => void
): void => {
  if (!canvas) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0);
    const base64 = tempCanvas.toDataURL('image/jpeg');
    
    fabric.Image.fromURL(base64, (fabricImg) => {
      canvas.setBackgroundImage(fabricImg, canvas.renderAll.bind(canvas), {
        scaleX: canvas.width! / fabricImg.width!,
        scaleY: canvas.height! / fabricImg.height!
      });
      
      if (callback) callback();
    });
  };
  
  img.src = imageUrl;
};

export const createTextObject = (
  overlay: OverlayType, 
  canvas: fabric.Canvas
): fabric.Textbox => {
  const { data, position } = overlay;
  
  const textObject = new fabric.Textbox(data.text, {
    left: position?.x ?? canvas.width! / 2,
    top: position?.y ?? canvas.height! / 2,
    fontFamily: data.fontFamily,
    fontSize: data.fontSize,
    fontWeight: data.fontWeight as any,
    fontStyle: data.fontStyle as any,
    textAlign: data.textAlign as any,
    fill: data.fill,
    stroke: data.stroke,
    strokeWidth: data.strokeWidth,
    originX: 'center',
    originY: 'center',
    padding: 5,
    cornerSize: 10,
    borderColor: 'hsl(var(--primary))',
    cornerColor: 'hsl(var(--primary))',
    transparentCorners: false,
    width: 200
  });
  
  return textObject;
};

export const loadSlideToCanvas = (
  canvas: fabric.Canvas, 
  slide: SlideType,
  onTextObjectCreated: (overlay: OverlayType, textObject: fabric.Textbox) => void
): void => {
  if (!canvas || !slide) return;
  
  canvas.clear();
  updateCanvasSize(canvas, slide.aspectRatio);
  
  if (slide.background.type === 'image') {
    setBackgroundImage(canvas, slide.background.value);
  } else {
    canvas.backgroundColor = slide.background.value;
  }
  
  slide.overlays.forEach(overlay => {
    if (overlay.type === 'text') {
      const textObject = createTextObject(overlay, canvas);
      canvas.add(textObject);
      onTextObjectCreated(overlay, textObject);
    }
  });
  
  canvas.renderAll();
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
  const img = new Image();
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

export const exportSlideAsImage = (canvas: fabric.Canvas): Promise<string> => {
  return new Promise((resolve) => {
    const dataUrl = canvas.toDataURL({
      format: 'jpeg',
      quality: 0.8
    });
    resolve(dataUrl);
  });
};