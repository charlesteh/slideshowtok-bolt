import { fabric } from 'fabric';
import { SlideType } from '../types';
import { ASPECT_RATIOS } from '../constants';
import { setBackgroundImage } from './fabricUtils';

export const generateSlideThumbnail = async (
  slide: SlideType, 
  width: number = 160, 
  height: number = 90
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }
    
    const fabricCanvas = new fabric.Canvas(canvas, {
      width: width,
      height: height,
      backgroundColor: '#ffffff'
    });
    
    if (slide.background.type === 'image') {
      // Create a new image element
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Create a temporary canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
          resolve('');
          return;
        }
        
        // Draw and convert to base64
        tempCtx.drawImage(img, 0, 0);
        const base64 = tempCanvas.toDataURL('image/jpeg');
        
        // Use base64 image with fabric
        fabric.Image.fromURL(base64, (fabricImg) => {
          fabricCanvas.setBackgroundImage(fabricImg, fabricCanvas.renderAll.bind(fabricCanvas), {
            scaleX: width / fabricImg.width!,
            scaleY: height / fabricImg.height!
          });
          
          const thumbnailUrl = fabricCanvas.toDataURL({
            format: 'jpeg',
            quality: 0.5
          });
          
          fabricCanvas.dispose();
          resolve(thumbnailUrl);
        });
      };
      
      img.src = slide.background.value;
    } else {
      fabricCanvas.backgroundColor = slide.background.value;
      const dataUrl = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.5
      });
      fabricCanvas.dispose();
      resolve(dataUrl);
    }
  });
};

export const exportAllSlides = async (
  slides: SlideType[]
): Promise<Blob[]> => {
  const blobs: Blob[] = [];
  
  for (const slide of slides) {
    const canvas = document.createElement('canvas');
    const aspectRatioConfig = ASPECT_RATIOS[slide.aspectRatio];
    
    const fabricCanvas = new fabric.Canvas(canvas, {
      width: aspectRatioConfig.width,
      height: aspectRatioConfig.height,
      backgroundColor: '#ffffff'
    });
    
    // Create a promise to handle async background loading
    const slideExport = new Promise<Blob>((resolve) => {
      if (slide.background.type === 'image') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) {
            resolve(new Blob(['Export failed'], { type: 'text/plain' }));
            return;
          }
          
          tempCtx.drawImage(img, 0, 0);
          const base64 = tempCanvas.toDataURL('image/jpeg');
          
          fabric.Image.fromURL(base64, (fabricImg) => {
            fabricCanvas.setBackgroundImage(fabricImg, fabricCanvas.renderAll.bind(fabricCanvas), {
              scaleX: fabricCanvas.width! / fabricImg.width!,
              scaleY: fabricCanvas.height! / fabricImg.height!
            });
            
            // Add all overlays
            slide.overlays.forEach(overlay => {
              if (overlay.type === 'text') {
                const { data, position } = overlay;
                const textObject = new fabric.Textbox(data.text, {
                  left: position?.x ?? fabricCanvas.width! / 2,
                  top: position?.y ?? fabricCanvas.height! / 2,
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
                  angle: data.angle ?? 0,
                  scaleX: data.scaleX ?? 1,
                  scaleY: data.scaleY ?? 1,
                  width: 200
                });
                fabricCanvas.add(textObject);
              }
            });
            
            fabricCanvas.renderAll();
            
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(new Blob(['Export failed'], { type: 'text/plain' }));
              }
              fabricCanvas.dispose();
            }, 'image/jpeg', 0.8);
          });
        };
        
        img.src = slide.background.value;
      } else {
        fabricCanvas.backgroundColor = slide.background.value;
        
        // Add all overlays
        slide.overlays.forEach(overlay => {
          if (overlay.type === 'text') {
            const { data, position } = overlay;
            const textObject = new fabric.Textbox(data.text, {
              left: position?.x ?? fabricCanvas.width! / 2,
              top: position?.y ?? fabricCanvas.height! / 2,
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
              angle: data.angle ?? 0,
              scaleX: data.scaleX ?? 1,
              scaleY: data.scaleY ?? 1,
              width: 200
            });
            fabricCanvas.add(textObject);
          }
        });
        
        fabricCanvas.renderAll();
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(new Blob(['Export failed'], { type: 'text/plain' }));
          }
          fabricCanvas.dispose();
        }, 'image/jpeg', 0.8);
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
    // Multiple slides - create a zip or download individually
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