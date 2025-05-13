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
  const [isMountingObject, setIsMountingObject] = useState(false);
  
  const currentSlide = getCurrentSlide();

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current || !currentSlide) return;

    if (!fabricCanvasRef.current) {
      fabricCanvasRef.current = initCanvas(canvasRef.current, currentSlide);
      setupEventHandlers();
    }

    loadSlideCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        removeEventHandlers();
      }
    };
  }, [currentSlide?.id]);

  // Setup canvas event handlers
  const setupEventHandlers = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.on('mouse:down', handleMouseDown);
    fabricCanvasRef.current.on('mouse:up', handleMouseUp);
    fabricCanvasRef.current.on('object:modified', handleObjectModified);
    fabricCanvasRef.current.on('selection:created', handleSelectionCreated);
    fabricCanvasRef.current.on('selection:cleared', handleSelectionCleared);
    fabricCanvasRef.current.on('text:changed', handleTextChanged);
    fabricCanvasRef.current.on('object:moving', handleObjectMoving);
    fabricCanvasRef.current.on('text:editing:entered', handleTextEditingEntered);
    fabricCanvasRef.current.on('text:editing:exited', handleTextEditingExited);
  };

  // Remove canvas event handlers
  const removeEventHandlers = () => {
    if (!fabricCanvasRef.current) return;
    
    fabricCanvasRef.current.off('mouse:down', handleMouseDown);
    fabricCanvasRef.current.off('mouse:up', handleMouseUp);
    fabricCanvasRef.current.off('object:modified', handleObjectModified);
    fabricCanvasRef.current.off('selection:created', handleSelectionCreated);
    fabricCanvasRef.current.off('selection:cleared', handleSelectionCleared);
    fabricCanvasRef.current.off('text:changed', handleTextChanged);
    fabricCanvasRef.current.off('object:moving', handleObjectMoving);
    fabricCanvasRef.current.off('text:editing:entered', handleTextEditingEntered);
    fabricCanvasRef.current.off('text:editing:exited', handleTextEditingExited);
  };

  // Load the slide content to the canvas
  const loadSlideCanvas = () => {
    if (!fabricCanvasRef.current || !currentSlide) return;
    
    setIsMountingObject(true);
    
    loadSlideToCanvas(
      fabricCanvasRef.current,
      currentSlide,
      (overlay, textObject) => {
        // Store the overlay ID in the fabric object for reference
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
    
    setIsMountingObject(false);
  };

  // Event Handlers
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

  const handleTextEditingEntered = () => {
    setIsEditing(true);
  };

  const handleTextEditingExited = () => {
    setIsEditing(false);
    // Re-select the object after editing finishes
    setTimeout(() => {
      const activeObject = fabricCanvasRef.current?.getActiveObject();
      if (activeObject) {
        fabricCanvasRef.current?.setActiveObject(activeObject);
        updateControlsPosition(activeObject);
      }
    }, 0);
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
    if (isMountingObject) return;
    
    const modifiedObject = e.target;
    if (!modifiedObject || !currentSlide) return;

    // Get the overlay ID from the fabric object
    const overlayId = modifiedObject.get('overlayId');
    if (!overlayId) return;

    if (modifiedObject instanceof fabric.Textbox) {
      const { left, top, width, height, scaleX = 1, scaleY = 1, angle = 0 } = modifiedObject;
      
      // Save complete object state to context
      updateOverlay(currentSlide.id, overlayId, {
        position: {
          x: left ?? 0,
          y: top ?? 0
        },
        width: width ? width * scaleX : undefined,
        height: height ? height * scaleY : undefined,
        angle,
        scaleX,
        scaleY,
        fontFamily: modifiedObject.fontFamily,
        fontSize: modifiedObject.fontSize,
        fontWeight: modifiedObject.fontWeight,
        fontStyle: modifiedObject.fontStyle,
        textAlign: modifiedObject.textAlign,
        fill: modifiedObject.fill,
        stroke: modifiedObject.stroke,
        strokeWidth: modifiedObject.strokeWidth
      });
      
      updateControlsPosition(modifiedObject);
    }
  };

  const handleObjectMoving = (e: fabric.IEvent) => {
    const movingObject = e.target;
    if (!movingObject || !currentSlide) return;
    
    updateControlsPosition(movingObject);
    
    // Get the overlay ID from the fabric object
    const overlayId = movingObject.get('overlayId');
    if (!overlayId) return;
    
    if (movingObject instanceof fabric.Textbox) {
      const { left, top, angle = 0, scaleX = 1, scaleY = 1 } = movingObject;
      
      // We need to persist position changes to the context
      updateOverlay(currentSlide.id, overlayId, {
        position: {
          x: left ?? 0,
          y: top ?? 0
        },
        angle,
        scaleX,
        scaleY
      });
    }
  };

  const handleTextChanged = (e: fabric.IEvent) => {
    const textObject = e.target;
    if (!textObject || !currentSlide) return;

    // Get the overlay ID from the fabric object
    const overlayId = textObject.get('overlayId');
    if (!overlayId) return;

    if (textObject instanceof fabric.Textbox) {
      const { angle = 0, scaleX = 1, scaleY = 1 } = textObject;
      
      // Save the new text and preserve transformation properties
      updateOverlay(currentSlide.id, overlayId, {
        text: textObject.text ?? '',
        angle,
        scaleX,
        scaleY
      });
      
      updateControlsPosition(textObject);
    }
  };

  const handleSelectionCreated = (e: fabric.IEvent) => {
    const selected = e.selected?.[0];
    if (!selected || !currentSlide) return;

    // Get the overlay ID directly from the fabric object
    const overlayId = selected.get('overlayId');
    if (!overlayId) return;
    
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

  const handleStyleChange = (property: string, value: any) => {
    if (!currentSlide || !selectedOverlay || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Textbox)) return;

    // Store the current state and transformation values
    const currentState = {
      left: activeObject.left,
      top: activeObject.top,
      angle: activeObject.angle ?? 0,
      scaleX: activeObject.scaleX ?? 1,
      scaleY: activeObject.scaleY ?? 1,
      width: activeObject.width,
      height: activeObject.height
    };

    // Set the new property value
    let updatedValue;
    
    switch (property) {
      case 'fontFamily':
        activeObject.set('fontFamily', value);
        updatedValue = value;
        break;
      case 'fontSize':
        const size = parseInt(value);
        activeObject.set('fontSize', size);
        updatedValue = size;
        break;
      case 'fontWeight':
        const newWeight = activeObject.get('fontWeight') === 'bold' ? 'normal' : 'bold';
        activeObject.set('fontWeight', newWeight);
        updatedValue = newWeight;
        break;
      case 'fontStyle':
        const newStyle = activeObject.get('fontStyle') === 'italic' ? 'normal' : 'italic';
        activeObject.set('fontStyle', newStyle);
        updatedValue = newStyle;
        break;
      case 'textAlign':
        activeObject.set('textAlign', value);
        updatedValue = value;
        break;
    }

    // Restore position and transformation
    activeObject.set({
      left: currentState.left,
      top: currentState.top,
      angle: currentState.angle,
      scaleX: currentState.scaleX,
      scaleY: currentState.scaleY
    });
    
    // Make sure object is properly positioned
    activeObject.setCoords();
    
    // Create a complete update to ensure all properties are saved
    const updates = {
      [property]: updatedValue,
      angle: currentState.angle,
      scaleX: currentState.scaleX,
      scaleY: currentState.scaleY,
      width: currentState.width,
      height: currentState.height,
      position: {
        x: currentState.left ?? 0,
        y: currentState.top ?? 0
      }
    };
    
    // Update the overlay data
    updateOverlay(currentSlide.id, selectedOverlay.id, updates);
    
    // After React state updates, ensure the object is still selected
    setTimeout(() => {
      // Ensure selection remains and canvas redraws
      canvas.setActiveObject(activeObject);
      canvas.requestRenderAll();
      updateControlsPosition(activeObject);
    }, 0);
  };

  const handleDelete = () => {
    if (!currentSlide || !selectedOverlay || !fabricCanvasRef.current) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
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