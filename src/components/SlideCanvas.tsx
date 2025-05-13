import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { useSlideContext } from '../context/SlideContext';
import { OverlayType } from '../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Trash2 } from 'lucide-react';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { useFabricCanvas } from '../hooks/useFabricCanvas';

const SlideCanvas: React.FC = () => {
  const { getCurrentSlide, updateOverlay, deleteOverlay } = useSlideContext();
  const currentSlide = getCurrentSlide();
  
  const {
    canvasRef,
    selectedOverlay,
    isEditing,
    controlsPosition,
    handleStyleChange,
    handleDelete,
    setOnUpdateOverlay,
    setOnDeleteOverlay
  } = useFabricCanvas(currentSlide);

  // Pass context callbacks to the hook
  useEffect(() => {
    setOnUpdateOverlay((slideId, overlayId, data) => {
      updateOverlay(slideId, overlayId, data);
    });
    
    setOnDeleteOverlay((slideId, overlayId) => {
      deleteOverlay(slideId, overlayId);
    });
  }, [updateOverlay, deleteOverlay]);

  return (
    <div className="relative flex justify-center items-center w-full max-h-[70vh] overflow-hidden">
      <div className="canvas-container relative shadow-xl">
        <canvas ref={canvasRef} className="border border-gray-200 rounded" />
        {selectedOverlay && selectedOverlay.type === 'text' && !isEditing && (
          <div 
            className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 flex gap-2 items-center"
            style={{
              top: controlsPosition.top,
              left: controlsPosition.left,
              transform: 'translateX(-50%)'
            }}
          >
            <Select value={selectedOverlay.data.fontFamily} onValueChange={(value) => handleStyleChange('fontFamily', value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue>
                  <span className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    <span className="truncate">{selectedOverlay.data.fontFamily}</span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedOverlay.data.fontSize.toString()} 
              onValueChange={(value) => handleStyleChange('fontSize', value)}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_SIZES.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Toggle
              pressed={selectedOverlay.data.fontWeight === 'bold'}
              onPressedChange={() => handleStyleChange('fontWeight', null)}
              size="sm"
            >
              <Bold className="h-4 w-4" />
            </Toggle>

            <Toggle
              pressed={selectedOverlay.data.fontStyle === 'italic'}
              onPressedChange={() => handleStyleChange('fontStyle', null)}
              size="sm"
            >
              <Italic className="h-4 w-4" />
            </Toggle>

            <div className="flex gap-1">
              <Toggle
                pressed={selectedOverlay.data.textAlign === 'left'}
                onPressedChange={() => handleStyleChange('textAlign', 'left')}
                size="sm"
              >
                <AlignLeft className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={selectedOverlay.data.textAlign === 'center'}
                onPressedChange={() => handleStyleChange('textAlign', 'center')}
                size="sm"
              >
                <AlignCenter className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={selectedOverlay.data.textAlign === 'right'}
                onPressedChange={() => handleStyleChange('textAlign', 'right')}
                size="sm"
              >
                <AlignRight className="h-4 w-4" />
              </Toggle>
            </div>

            <Toggle
              pressed={false}
              onPressedChange={handleDelete}
              size="sm"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Toggle>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideCanvas;