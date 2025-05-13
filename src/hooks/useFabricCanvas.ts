import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { SlideType, OverlayType } from '../types';
import { ASPECT_RATIOS } from '../constants';
import { initCanvas, loadSlideToCanvas } from '../utils/fabricUtils';

type ObjectEventHandler = (e: fabric.IEvent) => void;

export function useFabricCanvas(slide: SlideType | undefined) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayType | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !slide) return;

    if (!fabricCanvasRef.current) {
      fabricCanvasRef.current = initCanvas(canvasRef.current, slide);
      setIsCanvasReady(true);
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [slide?.id]);

  // Update canvas when slide changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !slide || !isCanvasReady) return;

    const handleSelectionCreated: ObjectEventHandler = (e) => {
      const selected = e.selected?.[0];
      if (!selected || !slide) return;

      slide.overlays.forEach(overlay => {
        if (overlay.type === 'text') {
          const textObject = fabricCanvasRef.current?.getObjects().find(
            obj => obj instanceof fabric.Textbox && 
            obj.left === overlay.position?.x && 
            obj.top === overlay.position?.y
          );
          
          if (textObject === selected) {
            setSelectedOverlay(overlay);
            updateControlsPosition(selected);
          }
        }
      });
    };

    const handleSelectionCleared = () => {
      setSelectedOverlay(null);
      setIsEditing(false);
    };

    const handleObjectModified: ObjectEventHandler = (e) => {
      const modifiedObject = e.target;
      if (!modifiedObject || !slide || !selectedOverlay) return;
  
      if (modifiedObject instanceof fabric.Textbox) {
        const { left, top, width, height, scaleX = 1, scaleY = 1, angle = 0 } = modifiedObject;
        if (onUpdateOverlay) {
          onUpdateOverlay(slide.id, selectedOverlay.id, {
            position: {
              x: left ?? 0,
              y: top ?? 0
            },
            width: width! * scaleX,
            height: height! * scaleY,
            angle,
            scaleX,
            scaleY
          });
        }
        updateControlsPosition(modifiedObject);
      }
    };

    const handleObjectMoving: ObjectEventHandler = (e) => {
      const movingObject = e.target;
      if (!movingObject || !slide || !selectedOverlay) return;
      
      updateControlsPosition(movingObject);
      
      if (movingObject instanceof fabric.Textbox) {
        const { left, top } = movingObject;
        if (onUpdateOverlay && left !== undefined && top !== undefined) {
          onUpdateOverlay(slide.id, selectedOverlay.id, {
            position: {
              x: left,
              y: top
            }
          });
        }
      }
    };

    const handleTextChanged: ObjectEventHandler = (e) => {
      const textObject = e.target;
      if (!textObject || !slide || !selectedOverlay || !onUpdateOverlay) return;
  
      if (textObject instanceof fabric.Textbox) {
        onUpdateOverlay(slide.id, selectedOverlay.id, {
          text: textObject.text ?? ''
        });
        updateControlsPosition(textObject);
      }
    };

    const handleMouseDown: ObjectEventHandler = (e) => {
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

    const textEditingEntered = () => setIsEditing(true);
    const textEditingExited = () => {
      setIsEditing(false);
      // Re-select the object after editing
      const activeObject = fabricCanvasRef.current?.getActiveObject();
      if (activeObject) {
        fabricCanvasRef.current?.setActiveObject(activeObject);
        updateControlsPosition(activeObject);
      }
    };

    // Register event handlers
    const canvas = fabricCanvasRef.current;
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('text:changed', handleTextChanged);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('text:editing:entered', textEditingEntered);
    canvas.on('text:editing:exited', textEditingExited);
    
    // Load slide content
    loadSlideToCanvas(
      canvas,
      slide,
      (overlay, textObject) => {
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

    // Cleanup event handlers
    return () => {
      if (canvas) {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:up', handleMouseUp);
        canvas.off('object:modified', handleObjectModified);
        canvas.off('selection:created', handleSelectionCreated);
        canvas.off('selection:cleared', handleSelectionCleared);
        canvas.off('text:changed', handleTextChanged);
        canvas.off('object:moving', handleObjectMoving);
        canvas.off('text:editing:entered', textEditingEntered);
        canvas.off('text:editing:exited', textEditingExited);
      }
    };
  }, [slide, isCanvasReady]);

  // Function to update controls position
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

  // Callback for style changes
  const handleStyleChange = (property: string, value: any) => {
    if (!fabricCanvasRef.current || !selectedOverlay) return;

    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Textbox)) return;

    // Store current state before modifications
    const currentProps = {
      left: activeObject.left,
      top: activeObject.top,
      angle: activeObject.angle || 0,
      scaleX: activeObject.scaleX || 1,
      scaleY: activeObject.scaleY || 1
    };

    // Create a property update object
    const propertyUpdate: Record<string, any> = {};

    // Apply the change to the fabric object
    switch (property) {
      case 'fontFamily':
        activeObject.set('fontFamily', value);
        propertyUpdate.fontFamily = value;
        break;
      case 'fontSize':
        const size = parseInt(value);
        activeObject.set('fontSize', size);
        propertyUpdate.fontSize = size;
        break;
      case 'fontWeight':
        const newWeight = activeObject.get('fontWeight') === 'bold' ? 'normal' : 'bold';
        activeObject.set('fontWeight', newWeight);
        propertyUpdate.fontWeight = newWeight;
        break;
      case 'fontStyle':
        const newStyle = activeObject.get('fontStyle') === 'italic' ? 'normal' : 'italic';
        activeObject.set('fontStyle', newStyle);
        propertyUpdate.fontStyle = newStyle;
        break;
      case 'textAlign':
        activeObject.set('textAlign', value);
        propertyUpdate.textAlign = value;
        break;
    }

    // Restore position and transformation
    activeObject.set({
      left: currentProps.left,
      top: currentProps.top,
      angle: currentProps.angle,
      scaleX: currentProps.scaleX,
      scaleY: currentProps.scaleY
    });

    // Make sure the object is properly positioned
    activeObject.setCoords();
    
    // Update state but defer to avoid immediate re-render
    if (onUpdateOverlay && slide) {
      onUpdateOverlay(slide.id, selectedOverlay.id, propertyUpdate);
    }
    
    // Ensure object remains selected and visible
    canvas.setActiveObject(activeObject);
    canvas.requestRenderAll();
    
    // Update floating controls position
    updateControlsPosition(activeObject);
  };

  // Delete the currently selected overlay
  const handleDelete = () => {
    if (!fabricCanvasRef.current || !selectedOverlay || !slide || !onDeleteOverlay) return;
    
    const activeObject = fabricCanvasRef.current.getActiveObject();
    if (activeObject) {
      fabricCanvasRef.current.remove(activeObject);
      onDeleteOverlay(slide.id, selectedOverlay.id);
      setSelectedOverlay(null);
    }
  };

  // External callbacks
  const onUpdateOverlay = (slideId: string, overlayId: string, data: Partial<OverlayType['data']>) => {
    // To be implemented by the component
  };

  const onDeleteOverlay = (slideId: string, overlayId: string) => {
    // To be implemented by the component
  };

  return {
    canvasRef,
    fabricCanvas: fabricCanvasRef.current,
    selectedOverlay,
    isEditing,
    controlsPosition,
    handleStyleChange,
    handleDelete,
    setOnUpdateOverlay: (callback: typeof onUpdateOverlay) => {
      // @ts-ignore - This is a way to pass the callback from the component
      onUpdateOverlay = callback;
    },
    setOnDeleteOverlay: (callback: typeof onDeleteOverlay) => {
      // @ts-ignore - This is a way to pass the callback from the component
      onDeleteOverlay = callback;
    }
  };
}