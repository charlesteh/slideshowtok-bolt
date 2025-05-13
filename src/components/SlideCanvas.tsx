import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { FabricJSCanvas, useFabricJSEditor } from 'fabricjs-react';
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
import { ASPECT_RATIOS } from '../constants';

const SlideCanvas: React.FC = () => {
  const { getCurrentSlide, updateOverlay, deleteOverlay } = useSlideContext();
  const { editor, onReady } = useFabricJSEditor();
  const currentSlide = getCurrentSlide();
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayType | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  
  // Initialize canvas with slide content
  const setupCanvas = () => {
    if (!editor || !currentSlide) return;
    
    // Clear canvas
    editor.canvas.clear();
    
    // Set canvas size from aspect ratio
    const aspectRatioConfig = ASPECT_RATIOS[currentSlide.aspectRatio];
    editor.canvas.setWidth(aspectRatioConfig.width);
    editor.canvas.setHeight(aspectRatioConfig.height);
    
    // Set background
    if (currentSlide.background.type === 'image') {
      fabric.Image.fromURL(currentSlide.background.value, (img) => {
        editor.canvas.setBackgroundImage(img, editor.canvas.renderAll.bind(editor.canvas), {
          scaleX: editor.canvas.width! / img.width!,
          scaleY: editor.canvas.height! / img.height!
        });
      });
    } else {
      editor.canvas.setBackgroundColor(currentSlide.background.value, 
        editor.canvas.renderAll.bind(editor.canvas));
    }
    
    // Add text overlays
    currentSlide.overlays.forEach(overlay => {
      if (overlay.type === 'text') {
        const { data, position } = overlay;
        const textObject = new fabric.Textbox(data.text, {
          left: position?.x ?? editor.canvas.width! / 2,
          top: position?.y ?? editor.canvas.height! / 2,
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
          width: data.width || 200,
          angle: data.angle ?? 0,
          scaleX: data.scaleX ?? 1,
          scaleY: data.scaleY ?? 1
        });
        
        // Set overlay ID as a custom property on the fabric object
        textObject.set('overlayId', overlay.id);
        
        // Set controls visibility
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
        
        editor.canvas.add(textObject);
      }
    });
    
    // Set up event handlers
    setupEventHandlers();
    
    editor.canvas.renderAll();
    setCanvasInitialized(true);
  };
  
  // Set up event handlers for the fabric canvas
  const setupEventHandlers = () => {
    if (!editor) return;
    
    // Double click to edit text
    editor.canvas.on('mouse:down', (e: fabric.IEvent) => {
      const activeObject = editor.canvas.getActiveObject();
      if (activeObject instanceof fabric.Textbox) {
        if (e.e && (e.e as MouseEvent).detail === 2) {
          activeObject.enterEditing();
          setIsEditing(true);
        }
      }
    });
    
    // Text editing started/ended
    editor.canvas.on('text:editing:entered', () => setIsEditing(true));
    editor.canvas.on('text:editing:exited', () => {
      setIsEditing(false);
      // Re-select the object after editing
      const activeObject = editor.canvas.getActiveObject();
      if (activeObject) {
        editor.canvas.setActiveObject(activeObject);
        updateControlsPosition(activeObject);
      }
    });
    
    // Selection events
    editor.canvas.on('selection:created', (e: fabric.IEvent) => {
      const selected = e.selected?.[0];
      if (!selected || !currentSlide) return;
      
      // Find the corresponding overlay
      const overlayId = selected.get('overlayId');
      const overlay = currentSlide.overlays.find(o => o.id === overlayId);
      
      if (overlay) {
        setSelectedOverlay(overlay);
        updateControlsPosition(selected);
      }
    });
    
    editor.canvas.on('selection:cleared', () => {
      setSelectedOverlay(null);
      setIsEditing(false);
    });
    
    // Object modified events
    editor.canvas.on('object:modified', (e: fabric.IEvent) => {
      const modifiedObject = e.target;
      if (!modifiedObject || !currentSlide) return;
      
      const overlayId = modifiedObject.get('overlayId');
      if (!overlayId) return;
      
      if (modifiedObject instanceof fabric.Textbox) {
        const { left, top, width, height, scaleX = 1, scaleY = 1, angle = 0 } = modifiedObject;
        updateOverlay(currentSlide.id, overlayId, {
          position: {
            x: left ?? 0,
            y: top ?? 0
          },
          width: width ? width * scaleX : undefined,
          height: height ? height * scaleY : undefined,
          angle,
          scaleX,
          scaleY
        });
        updateControlsPosition(modifiedObject);
      }
    });
    
    // Text changed events
    editor.canvas.on('text:changed', (e: fabric.IEvent) => {
      const textObject = e.target;
      if (!textObject || !currentSlide) return;
      
      const overlayId = textObject.get('overlayId');
      if (!overlayId) return;
      
      if (textObject instanceof fabric.Textbox) {
        updateOverlay(currentSlide.id, overlayId, {
          text: textObject.text ?? ''
        });
        updateControlsPosition(textObject);
      }
    });
    
    // Moving events
    editor.canvas.on('object:moving', (e: fabric.IEvent) => {
      const movingObject = e.target;
      if (!movingObject || !currentSlide) return;
      
      updateControlsPosition(movingObject);
      
      const overlayId = movingObject.get('overlayId');
      if (!overlayId) return;
      
      if (movingObject instanceof fabric.Textbox) {
        const { left, top } = movingObject;
        updateOverlay(currentSlide.id, overlayId, {
          position: {
            x: left ?? 0,
            y: top ?? 0
          }
        });
      }
    });
  };
  
  // Update canvas when slide changes
  useEffect(() => {
    if (editor && currentSlide) {
      setupCanvas();
    }
  }, [editor, currentSlide?.id]);
  
  // Initialize on component mount
  const handleCanvasReady = (canvas: fabric.Canvas) => {
    onReady(canvas);
  };
  
  // Function to update controls position
  const updateControlsPosition = (object: fabric.Object) => {
    if (!canvasWrapperRef.current || !editor) return;
    
    const zoom = editor.canvas.getZoom() || 1;
    const rect = object.getBoundingRect();
    const canvasRect = canvasWrapperRef.current.getBoundingClientRect();
    
    setControlsPosition({
      top: canvasRect.top + (rect.top + rect.height) * zoom + 10,
      left: canvasRect.left + rect.left * zoom + (rect.width * zoom) / 2
    });
  };
  
  // Handle font and style changes
  const handleStyleChange = (property: string, value: any) => {
    if (!editor || !selectedOverlay || !currentSlide) return;
    
    const activeObject = editor.canvas.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Textbox)) return;
    
    // Store current state
    const currentState = {
      left: activeObject.left,
      top: activeObject.top,
      angle: activeObject.angle,
      scaleX: activeObject.scaleX,
      scaleY: activeObject.scaleY
    };
    
    // Update the property
    let propertyValue: any;
    
    switch (property) {
      case 'fontFamily':
        activeObject.set('fontFamily', value);
        propertyValue = value;
        break;
      case 'fontSize':
        const size = parseInt(value);
        activeObject.set('fontSize', size);
        propertyValue = size;
        break;
      case 'fontWeight':
        const newWeight = activeObject.get('fontWeight') === 'bold' ? 'normal' : 'bold';
        activeObject.set('fontWeight', newWeight);
        propertyValue = newWeight;
        break;
      case 'fontStyle':
        const newStyle = activeObject.get('fontStyle') === 'italic' ? 'normal' : 'italic';
        activeObject.set('fontStyle', newStyle);
        propertyValue = newStyle;
        break;
      case 'textAlign':
        activeObject.set('textAlign', value);
        propertyValue = value;
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
    
    // Make sure the object is properly positioned
    activeObject.setCoords();
    
    // Update the overlay in context
    updateOverlay(currentSlide.id, selectedOverlay.id, {
      [property]: propertyValue
    });
    
    // Request render after state updates
    setTimeout(() => {
      editor.canvas.setActiveObject(activeObject);
      editor.canvas.requestRenderAll();
      updateControlsPosition(activeObject);
    }, 0);
  };
  
  // Handle delete action
  const handleDelete = () => {
    if (!editor || !selectedOverlay || !currentSlide) return;
    
    const activeObject = editor.canvas.getActiveObject();
    if (activeObject) {
      editor.canvas.remove(activeObject);
      deleteOverlay(currentSlide.id, selectedOverlay.id);
      setSelectedOverlay(null);
    }
  };
  
  return (
    <div className="relative flex justify-center items-center w-full max-h-[70vh] overflow-hidden">
      <div ref={canvasWrapperRef} className="canvas-container relative shadow-xl">
        <FabricJSCanvas className="border border-gray-200 rounded" onReady={handleCanvasReady} />
        
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