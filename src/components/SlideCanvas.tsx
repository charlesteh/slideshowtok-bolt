import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { useSlideContext } from '../context/SlideContext';
import { OverlayType } from '../types';
import { initCanvas, loadSlideToCanvas } from '../utils/fabricUtils';
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

const SlideCanvas: React.FC = () => {
  const { getCurrentSlide, updateOverlay, deleteOverlay } = useSlideContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayType | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  
  const currentSlide = getCurrentSlide();

  // Initialize the canvas once on component mount
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Only create the canvas once
    if (!fabricCanvasRef.current) {
      const canvas = initCanvas(canvasRef.current, currentSlide || {
        id: 'temp',
        aspectRatio: '4:5',
        background: { type: 'color', value: '#ffffff' },
        overlays: []
      });
      
      fabricCanvasRef.current = canvas;
      
      // Set up event handlers - these remain even when slides change
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:up', handleMouseUp);
      canvas.on('object:modified', handleObjectModified);
      canvas.on('selection:created', handleSelectionCreated);
      canvas.on('selection:cleared', handleSelectionCleared);
      canvas.on('text:changed', handleTextChanged);
      canvas.on('object:moving', handleObjectMoving);
      canvas.on('text:editing:entered', () => setIsEditing(true));
      canvas.on('text:editing:exited', () => {
        setIsEditing(false);
        // Re-select the object after editing
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          canvas.setActiveObject(activeObject);
          updateControlsPosition(activeObject);
        }
      });
    }
    
    // Cleanup event handlers when component unmounts
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('mouse:down', handleMouseDown);
        fabricCanvasRef.current.off('mouse:up', handleMouseUp);
        fabricCanvasRef.current.off('object:modified', handleObjectModified);
        fabricCanvasRef.current.off('selection:created', handleSelectionCreated);
        fabricCanvasRef.current.off('selection:cleared', handleSelectionCleared);
        fabricCanvasRef.current.off('text:changed', handleTextChanged);
        fabricCanvasRef.current.off('object:moving', handleObjectMoving);
        fabricCanvasRef.current.off('text:editing:entered');
        fabricCanvasRef.current.off('text:editing:exited');
      }
    };
  }, []);

  // Update canvas when current slide changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !currentSlide) return;

    // Load the current slide into the canvas
    loadSlideToCanvas(
      fabricCanvasRef.current,
      currentSlide,
      (overlay, textObject) => {
        // Store overlay ID on the fabric object for direct reference
        textObject.set('overlayId', overlay.id);
        
        textObject.setControlsVisibility({
          mt: false,
          mb: false,
          ml: true,
          mr: true,
          tl: true,
          tr: true,
          bl: true,
          br: true,
          mtr: true,
        });
      }
    );
    
    // Clear selection when changing slides
    setSelectedOverlay(null);
    
  }, [currentSlide?.id]);

  // Direct fabric canvas event handlers
  const handleMouseDown = (e: fabric.IEvent) => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (activeObject instanceof fabric.Textbox) {
      if (e.e && (e.e as MouseEvent).detail === 2) {
        activeObject.enterEditing();
        setIsEditing(true);
      }
    }
  };

  const handleMouseUp = () => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (activeObject instanceof fabric.Textbox && !activeObject.isEditing) {
      setIsEditing(false);
    }
  };

  const updateControlsPosition = (object: fabric.Object) => {
    if (!canvasRef.current) return;
    
    const zoom = fabricCanvasRef.current?.getZoom() || 1;
    const rect = object.getBoundingRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    setControlsPosition({
      top: canvasRect.top + (rect.top + rect.height) * zoom + 10,
      left: canvasRect.left + rect.left * zoom + (rect.width * zoom) / 2
    });
  };

  const handleObjectModified = (e: fabric.IEvent) => {
    const modifiedObject = e.target;
    if (!modifiedObject || !currentSlide) return;

    // Get overlay ID directly from the fabric object
    const overlayId = modifiedObject.get('overlayId');
    if (!overlayId) return;

    if (modifiedObject instanceof fabric.Textbox) {
      const { left, top, width, height, scaleX = 1, scaleY = 1, angle = 0 } = modifiedObject;
      
      // Save all properties to context
      updateOverlay(currentSlide.id, overlayId, {
        width: width ? width * scaleX : undefined,
        height: height ? height * scaleY : undefined,
        angle,
        scaleX,
        scaleY,
        position: {
          x: left ?? 0,
          y: top ?? 0
        }
      });
      
      updateControlsPosition(modifiedObject);
    }
  };

  const handleObjectMoving = (e: fabric.IEvent) => {
    const movingObject = e.target;
    if (!movingObject || !currentSlide) return;
    
    updateControlsPosition(movingObject);
    
    // Get overlay ID directly from the fabric object
    const overlayId = movingObject.get('overlayId');
    if (!overlayId) return;
    
    if (movingObject instanceof fabric.Textbox) {
      const { left, top } = movingObject;
      
      // Only update position during move for performance
      updateOverlay(currentSlide.id, overlayId, {
        position: {
          x: left ?? 0,
          y: top ?? 0
        }
      });
    }
  };

  const handleTextChanged = (e: fabric.IEvent) => {
    const textObject = e.target;
    if (!textObject || !currentSlide) return;

    // Get overlay ID directly from the fabric object
    const overlayId = textObject.get('overlayId');
    if (!overlayId) return;

    if (textObject instanceof fabric.Textbox) {
      // Only update the text content
      updateOverlay(currentSlide.id, overlayId, {
        text: textObject.text ?? ''
      });
      
      updateControlsPosition(textObject);
    }
  };

  const handleSelectionCreated = (e: fabric.IEvent) => {
    const selected = e.selected?.[0];
    if (!selected || !currentSlide) return;

    // Get overlay ID directly from the fabric object
    const overlayId = selected.get('overlayId');
    if (!overlayId) return;
    
    // Find the overlay by ID
    const overlay = currentSlide.overlays.find(o => o.id === overlayId);
    if (overlay) {
      setSelectedOverlay(overlay);
      updateControlsPosition(selected);
    }
  };

  const handleSelectionCleared = () => {
    setSelectedOverlay(null);
    setIsEditing(false);
  };

  // UI-initiated changes
  const handleStyleChange = (property: string, value: any) => {
    if (!currentSlide || !selectedOverlay || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Textbox)) return;

    // Preserve current transformation state
    const currentTransform = {
      left: activeObject.left,
      top: activeObject.top,
      angle: activeObject.angle,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY,
      width: activeObject.width,
      height: activeObject.height
    };

    // Direct fabric.js modification first
    switch (property) {
      case 'fontFamily':
        activeObject.set('fontFamily', value);
        break;
      case 'fontSize':
        const size = parseInt(value);
        activeObject.set('fontSize', size);
        break;
      case 'fontWeight':
        const newWeight = activeObject.get('fontWeight') === 'bold' ? 'normal' : 'bold';
        activeObject.set('fontWeight', newWeight);
        value = newWeight; // Store the actual value
        break;
      case 'fontStyle':
        const newStyle = activeObject.get('fontStyle') === 'italic' ? 'normal' : 'italic';
        activeObject.set('fontStyle', newStyle);
        value = newStyle; // Store the actual value
        break;
      case 'textAlign':
        activeObject.set('textAlign', value);
        break;
    }

    // Preserve position and transformation
    activeObject.set({
      left: currentTransform.left,
      top: currentTransform.top,
      angle: currentTransform.angle,
      scaleX: currentTransform.scaleX,
      scaleY: currentTransform.scaleY
    });
    
    // Update coordinates to ensure proper positioning
    activeObject.setCoords();
    
    // Update React state with the style change
    const updates = {
      [property]: value,
      // Preserve position and transformation
      position: {
        x: currentTransform.left ?? 0,
        y: currentTransform.top ?? 0
      },
      angle: currentTransform.angle ?? 0,
      scaleX: currentTransform.scaleX ?? 1,
      scaleY: currentTransform.scaleY ?? 1,
      width: currentTransform.width,
      height: currentTransform.height
    };
    
    // Update context
    updateOverlay(currentSlide.id, selectedOverlay.id, updates);
    
    // Ensure object remains selected
    canvas.setActiveObject(activeObject);
    canvas.requestRenderAll();
    
    // Update controls position
    updateControlsPosition(activeObject);
  };

  const handleDelete = () => {
    if (!currentSlide || !selectedOverlay || !fabricCanvasRef.current) return;
    
    // Direct fabric.js modification
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
      
      // Then update React state
      deleteOverlay(currentSlide.id, selectedOverlay.id);
      setSelectedOverlay(null);
    }
  };

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