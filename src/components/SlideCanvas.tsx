import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from 'react-konva';
import { useSlideContext } from '../context/SlideContext';
import { OverlayType } from '../types';
import { getCanvasSize, createTextConfig } from '../utils/konvaUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Trash2 } from 'lucide-react';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import Konva from 'konva';
import ColorPicker from './ColorPicker';

const SlideCanvas: React.FC = () => {
  const { getCurrentSlide, updateOverlay, deleteOverlay } = useSlideContext();
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const textNodesRef = useRef<Map<string, Konva.Text>>(new Map());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const controlsTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  
  const currentSlide = getCurrentSlide();

  // Track text nodes with a ref to avoid stale references
  useEffect(() => {
    textNodesRef.current = new Map();
    return () => {
      textNodesRef.current.clear();
    };
  }, []);

  // Load background image when slide changes
  useEffect(() => {
    if (!currentSlide || currentSlide.background.type !== 'image') {
      setBackgroundImage(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = currentSlide.background.value;
    img.onload = () => {
      setBackgroundImage(img);
    };
  }, [currentSlide?.id, currentSlide?.background.value, currentSlide?.background.type]);

  // Clear selection when slide changes
  useEffect(() => {
    setSelectedId(null);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [currentSlide?.id]);

  // Attach transformer to selected node
  useEffect(() => {
    if (!transformerRef.current || !layerRef.current) return;
    
    const transformer = transformerRef.current;
    
    if (selectedId) {
      // Find the node by name or id
      const selectedNode = textNodesRef.current.get(selectedId);
      
      if (selectedNode) {
        // Check if the node is still in the layer
        if (selectedNode.getLayer()) {
          // Attach transformer to the node
          transformer.nodes([selectedNode]);
          transformer.getLayer()?.batchDraw();
          
          // Update controls position
          updateControlsPosition(selectedNode);
        } else {
          // Node no longer in layer, clear selection
          transformer.nodes([]);
          transformer.getLayer()?.batchDraw();
          setSelectedId(null);
        }
      } else {
        // No node found, clear transformer
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      // No selection, clear transformer
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  const updateControlsPosition = (node: Konva.Node) => {
    if (!stageRef.current || !node) return;
    
    try {
      const stage = stageRef.current;
      
      // Get absolute position on the page
      const stageBox = stage.container().getBoundingClientRect();
      const box = node.getClientRect();
      
      setControlsPosition({
        top: stageBox.top + box.y + box.height + 10,
        left: stageBox.left + box.x + box.width / 2
      });
    } catch (error) {
      console.error("Error updating controls position:", error);
    }
  };

  const handleSelect = (id: string) => {
    // Deselect if clicking the same node
    if (id === selectedId) {
      setSelectedId(null);
      return;
    }
    
    setSelectedId(id);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Clicked on an empty area of the stage
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, id: string) => {
    if (!currentSlide) return;
    
    const node = e.target;
    
    // Update position in state
    updateOverlay(currentSlide.id, id, {
      position: {
        x: node.x(),
        y: node.y()
      }
    });
    
    // Update control position
    updateControlsPosition(node);
  };

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>, id: string) => {
    if (!currentSlide) return;
    
    const node = e.target as Konva.Text;
    
    // Get the updated properties after transformation
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const width = node.width() * scaleX;
    const height = node.height() * scaleY;
    
    // Update the node to use the new dimensions but reset scale to 1
    // This prevents cumulative scaling issues
    node.scaleX(1);
    node.scaleY(1);
    node.width(width);
    node.height(height);
    
    // Update state with new transformation data
    updateOverlay(currentSlide.id, id, {
      angle: rotation,
      scaleX: 1,
      scaleY: 1,
      width: width,
      height: height,
      position: {
        x: node.x(),
        y: node.y()
      }
    });

    // Update control position
    updateControlsPosition(node);
    
    // Make sure to redraw the layer
    if (layerRef.current) {
      layerRef.current.batchDraw();
    }
  };

  const cleanupTextarea = () => {
    if (textareaRef.current && document.body.contains(textareaRef.current)) {
      document.body.removeChild(textareaRef.current);
      textareaRef.current = null;
    }
    window.removeEventListener('mousedown', handleOutsideClick);
    setIsEditing(false);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (textareaRef.current && e.target !== textareaRef.current) {
      const textNode = textNodesRef.current.get(selectedId || '');
      if (textNode && textareaRef.current) {
        textNode.text(textareaRef.current.value);
        
        // Update state
        if (currentSlide && selectedId) {
          updateOverlay(currentSlide.id, selectedId, {
            text: textareaRef.current.value
          });
        }
      }
      cleanupTextarea();
    }
  };

  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (!currentSlide) return;
    e.evt.preventDefault();
    
    const textNode = e.target as Konva.Text;
    
    // Enable text editing
    textNode.hide();
    if (transformerRef.current) {
      transformerRef.current.hide();
    }
    
    // Create a textarea for editing
    const textPosition = textNode.absolutePosition();
    const stageBox = stageRef.current?.container().getBoundingClientRect();
    
    if (!stageBox) return;
    
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    };
    
    // Remove existing textarea if any
    if (textareaRef.current) {
      cleanupTextarea();
    }
    
    // Create textarea
    const textarea = document.createElement('textarea');
    textareaRef.current = textarea;
    document.body.appendChild(textarea);
    
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width()}px`;
    textarea.style.height = `${Math.max(textNode.height(), 100)}px`;
    
    textarea.focus();
    
    setIsEditing(true);
    
    textarea.addEventListener('keydown', function(e) {
      // On enter without shift, complete editing
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        textNode.text(textarea.value);
        
        // Update state
        updateOverlay(currentSlide.id, id, {
          text: textarea.value
        });
        
        cleanupTextarea();
        
        textNode.show();
        if (transformerRef.current) {
          transformerRef.current.show();
        }
        if (layerRef.current) {
          layerRef.current.batchDraw();
        }
      }
      
      // On escape, cancel editing
      if (e.key === 'Escape') {
        cleanupTextarea();
        
        textNode.show();
        if (transformerRef.current) {
          transformerRef.current.show();
        }
        if (layerRef.current) {
          layerRef.current.batchDraw();
        }
      }
    });
    
    textarea.addEventListener('blur', function() {
      textNode.text(textarea.value);
      
      // Update state
      updateOverlay(currentSlide.id, id, {
        text: textarea.value
      });
      
      cleanupTextarea();
      
      textNode.show();
      if (transformerRef.current) {
        transformerRef.current.show();
      }
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    });
    
    // Handle resize of textarea
    textarea.addEventListener('mouseup', function() {
      // Update text node width based on textarea size
      const newWidth = textarea.clientWidth;
      textNode.width(newWidth);
      
      // Update state
      updateOverlay(currentSlide.id, id, {
        width: newWidth
      });
    });
    
    setTimeout(() => {
      window.addEventListener('mousedown', handleOutsideClick);
    });
  };

  // Handle text changes from the control panel textarea
  const handleControlsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentSlide || !selectedId) return;
    
    const newText = e.target.value;
    
    // Update the Konva text node
    const textNode = textNodesRef.current.get(selectedId);
    if (textNode) {
      textNode.text(newText);
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
    }
    
    // Update state
    updateOverlay(currentSlide.id, selectedId, {
      text: newText
    });
  };

  const handleStyleChange = (property: string, value: any) => {
    if (!currentSlide || !selectedId) return;
    
    const overlay = currentSlide.overlays.find(o => o.id === selectedId);
    if (!overlay || overlay.type !== 'text') return;
    
    let newValue = value;
    
    switch (property) {
      case 'fontWeight':
        newValue = overlay.data.fontWeight === 'bold' ? 'normal' : 'bold';
        break;
      case 'fontStyle':
        newValue = overlay.data.fontStyle === 'italic' ? 'normal' : 'italic';
        break;
    }
    
    // Update overlay data in state
    updateOverlay(currentSlide.id, selectedId, {
      [property]: newValue
    });
    
    // Find and update the Konva node
    const textNode = textNodesRef.current.get(selectedId);
    if (textNode) {
      try {
        switch (property) {
          case 'fontFamily':
            textNode.fontFamily(newValue);
            break;
          case 'fontSize':
            textNode.fontSize(parseInt(newValue));
            break;
          case 'fontWeight':
          case 'fontStyle':
            // Combine font weight and style
            const fontStyle = (
              (property === 'fontWeight' ? newValue : overlay.data.fontWeight) === 'bold' &&
              (property === 'fontStyle' ? newValue : overlay.data.fontStyle) === 'italic'
            ) ? 'bold italic' : (
              (property === 'fontWeight' ? newValue : overlay.data.fontWeight) === 'bold' ? 'bold' :
              (property === 'fontStyle' ? newValue : overlay.data.fontStyle) === 'italic' ? 'italic' : 'normal'
            );
            textNode.fontStyle(fontStyle);
            break;
          case 'textAlign':
            textNode.align(newValue);
            break;
          case 'fill':
            textNode.fill(newValue);
            break;
          case 'stroke':
            textNode.stroke(newValue);
            break;
          case 'strokeWidth':
            textNode.strokeWidth(newValue);
            break;
          case 'width':
            textNode.width(newValue);
            break;
        }
        
        // Update the layer
        if (layerRef.current) {
          layerRef.current.batchDraw();
        }
        
        // Update transformer
        if (transformerRef.current) {
          transformerRef.current.forceUpdate();
        }
        
        // Update controls position
        updateControlsPosition(textNode);
      } catch (error) {
        console.error("Error updating text style:", error);
      }
    }
  };

  const handleDelete = () => {
    if (!currentSlide || !selectedId) return;
    
    // Delete overlay from state
    deleteOverlay(currentSlide.id, selectedId);
    
    // Remove from node map
    textNodesRef.current.delete(selectedId);
    
    // Clear selection
    setSelectedId(null);
  };

  // Function to register text nodes as they are created in the render
  const registerTextNode = (id: string, node: Konva.Text) => {
    // Update the node reference map
    textNodesRef.current.set(id, node);
  };

  if (!currentSlide) return null;

  const { width, height } = getCanvasSize(currentSlide.aspectRatio);
  
  // Extract the selected overlay for the toolbar
  const selectedOverlay = selectedId 
    ? currentSlide.overlays.find(o => o.id === selectedId) 
    : null;

  return (
    <div className="relative flex justify-center items-center w-full max-h-[70vh] overflow-hidden">
      <div className="relative shadow-xl">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onClick={handleStageClick}
          className="border border-gray-200 rounded"
        >
          <Layer ref={layerRef}>
            {/* Background */}
            {currentSlide.background.type === 'color' ? (
              <Konva.Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={currentSlide.background.value}
              />
            ) : backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                width={width}
                height={height}
              />
            )}
            
            {/* Text Overlays */}
            {currentSlide.overlays.map((overlay) => {
              if (overlay.type === 'text') {
                const textConfig = createTextConfig(overlay);
                return (
                  <Text
                    key={overlay.id}
                    id={overlay.id}
                    name={overlay.id}
                    {...textConfig}
                    onClick={() => handleSelect(overlay.id)}
                    onDblClick={(e) => handleTextDblClick(e, overlay.id)}
                    onDragEnd={(e) => handleDragEnd(e, overlay.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, overlay.id)}
                    // Enable text wrapping
                    width={textConfig.width}
                    wrap="word"
                    ref={(node) => {
                      if (node) {
                        registerTextNode(overlay.id, node);
                      }
                    }}
                  />
                );
              }
              return null;
            })}
            
            {/* Transformer for selections */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit size to a reasonable value to prevent text scaling issues
                if (newBox.width < 10 || newBox.height < 10) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={[
                'top-left', 'top-center', 'top-right',
                'middle-left', 'middle-right',
                'bottom-left', 'bottom-center', 'bottom-right'
              ]}
              rotateEnabled={true}
              resizeEnabled={true}
            />
          </Layer>
        </Stage>
        
        {/* Text controls */}
        {selectedOverlay && selectedOverlay.type === 'text' && !isEditing && (
          <div 
            className="fixed z-50 bg-background border rounded-lg shadow-lg p-3 w-[300px]"
            style={{
              top: controlsPosition.top,
              left: controlsPosition.left,
              transform: 'translateX(-50%)'
            }}
          >
            {/* Text Editing Area */}
            <div className="mb-3">
              <textarea
                ref={controlsTextAreaRef}
                value={selectedOverlay.data.text}
                onChange={handleControlsTextChange}
                className="w-full p-2 border rounded-md resize-y h-20"
              />
            </div>
            
            {/* Row 1: Font Family and Delete */}
            <div className="flex justify-between items-center mb-2">
              <Select value={selectedOverlay.data.fontFamily} onValueChange={(value) => handleStyleChange('fontFamily', value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span className="truncate" style={{ fontFamily: selectedOverlay.data.fontFamily }}>
                        {selectedOverlay.data.fontFamily}
                      </span>
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
              
              <Toggle
                pressed={false}
                onPressedChange={handleDelete}
                size="sm"
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Toggle>
            </div>
            
            {/* Row 2: Font Size Slider */}
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Size: {selectedOverlay.data.fontSize}px</span>
              </div>
              <Slider
                value={[selectedOverlay.data.fontSize]}
                min={8}
                max={120}
                step={1}
                onValueChange={(value) => handleStyleChange('fontSize', value[0].toString())}
                className="w-full"
              />
            </div>
            
            {/* Width Control Slider */}
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Width: {Math.round(selectedOverlay.data.width || 200)}px</span>
              </div>
              <Slider
                value={[selectedOverlay.data.width || 200]}
                min={50}
                max={width - 20}  // Almost full slide width
                step={10}
                onValueChange={(value) => handleStyleChange('width', value[0])}
                className="w-full"
              />
            </div>
            
            {/* Row 3: Style Controls */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex gap-1">
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
              </div>
              
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
              
              <ColorPicker 
                color={selectedOverlay.data.fill}
                onChange={(color) => handleStyleChange('fill', color)}
                label="Color"
              />
            </div>
            
            {/* Outline Controls (always visible now) */}
            <div className="mt-2 pt-2 border-t">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-600">Outline Width: {selectedOverlay.data.strokeWidth}px</span>
                <ColorPicker 
                  color={selectedOverlay.data.stroke}
                  onChange={(color) => handleStyleChange('stroke', color)}
                  label="Outline"
                />
              </div>
              <Slider
                value={[selectedOverlay.data.strokeWidth]}
                min={0}
                max={20}
                step={0.5}
                onValueChange={(value) => handleStyleChange('strokeWidth', value[0])}
                className="w-full mt-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideCanvas;