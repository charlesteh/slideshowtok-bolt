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
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Trash2, Settings, Minus, Plus } from 'lucide-react';
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
  const textEditingId = useRef<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [showControls, setShowControls] = useState(false);
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
    setShowControls(false);
    if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer()?.batchDraw();
    }
    // Also remove any open textarea
    cleanupTextarea();
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
          setShowControls(false);
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
      setShowControls(false);
    }
  }, [selectedId]);

  const updateControlsPosition = (node: Konva.Node) => {
    if (!stageRef.current || !node) return;
    
    try {
      const stage = stageRef.current;
      
      // Get absolute position on the page
      const stageBox = stage.container().getBoundingClientRect();
      const nodeBox = node.getClientRect();
      
      // Position the button directly below the center of the text
      setControlsPosition({
        top: stageBox.top + nodeBox.y + nodeBox.height + 2, // Position directly below the text
        left: stageBox.left + nodeBox.x + nodeBox.width / 2, // Center horizontally
      });
    } catch (error) {
      console.error("Error updating controls position:", error);
    }
  };

  const handleSelect = (id: string) => {
    // Clean up textarea if one is open
    cleanupTextarea();
    
    // Deselect if clicking the same node
    if (id === selectedId) {
      setSelectedId(null);
      setShowControls(false);
      return;
    }
    
    setSelectedId(id);
    setShowControls(false); // Hide controls initially when selecting a new element
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Clicked on an empty area of the stage
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
      setShowControls(false);
      cleanupTextarea();
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

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Update the controls position during drag
    updateControlsPosition(e.target);
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
    
    // Reset scale to 1 and apply the actual size - THIS IS CRITICAL
    node.width(width);
    node.height(height);
    node.scaleX(1);
    node.scaleY(1);
    
    // Update state with new transformation data
    updateOverlay(currentSlide.id, id, {
      angle: rotation,
      scaleX: 1, // Reset scale to 1
      scaleY: 1, // Reset scale to 1
      width: width,
      height: height,
      position: {
        x: node.x(),
        y: node.y()
      }
    });

    // Update control position
    updateControlsPosition(node);
    
    // Force redraw
    layerRef.current?.batchDraw();
  };
  
  const cleanupTextarea = () => {
    if (textareaRef.current && document.body.contains(textareaRef.current)) {
      document.body.removeChild(textareaRef.current);
      textareaRef.current = null;
    }
    
    if (textEditingId.current) {
      const textNode = textNodesRef.current.get(textEditingId.current);
      if (textNode) {
        textNode.show();
      }
      textEditingId.current = null;
    }
    
    window.removeEventListener('mousedown', handleOutsideClick);
    setIsEditing(false);
  };

  const handleOutsideClick = (e: MouseEvent) => {
    if (textareaRef.current && e.target !== textareaRef.current) {
      if (textEditingId.current) {
        const textNode = textNodesRef.current.get(textEditingId.current);
        if (textNode && textareaRef.current) {
          textNode.text(textareaRef.current.value);
          
          // Update state
          if (currentSlide) {
            updateOverlay(currentSlide.id, textEditingId.current, {
              text: textareaRef.current.value
            });
          }
        }
      }
      cleanupTextarea();
    }
  };

  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (!currentSlide) return;
    e.evt.preventDefault();
    
    const textNode = e.target as Konva.Text;
    textEditingId.current = id;
    
    // Hide the text node while editing
    textNode.hide();
    if (transformerRef.current) {
      transformerRef.current.hide();
    }
    
    // Create a textarea for editing
    const textPosition = textNode.absolutePosition();
    const stageBox = stageRef.current?.container().getBoundingClientRect();
    
    if (!stageBox) return;
    
    const areaPosition = {
      x: stageBox.left + textPosition.x - textNode.offsetX(),
      y: stageBox.top + textPosition.y - textNode.offsetY()
    };
    
    // Remove any existing textarea
    cleanupTextarea();
    
    // Create a new textarea
    const textarea = document.createElement('textarea');
    textareaRef.current = textarea;
    document.body.appendChild(textarea);
    
    // Set the textarea properties
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width()}px`;
    textarea.style.height = `${Math.max(textNode.height(), 100)}px`;
    textarea.style.fontSize = `${textNode.fontSize()}px`;
    textarea.style.lineHeight = '1.2';
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.color = textNode.fill();
    textarea.style.border = '1px solid #000';
    textarea.style.padding = '5px';
    textarea.style.borderRadius = '3px';
    textarea.style.overflow = 'auto';
    textarea.style.background = '#fff';
    textarea.style.resize = 'both';
    textarea.style.outline = 'none';
    textarea.style.textAlign = textNode.align();
    
    // Focus the textarea
    textarea.focus();
    
    setIsEditing(true);
    
    // Event handlers
    textarea.addEventListener('keydown', function(e) {
      // Preserve Enter for newlines
      if (e.key === 'Enter' && e.shiftKey) {
        return; // Allow shift+enter for new lines
      }
      
      // On enter without shift, complete editing
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        finishEditing();
      }
      
      // On escape, cancel editing
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEditing();
      }
    });
    
    textarea.addEventListener('blur', finishEditing);
    
    // Handle resizing of textarea
    textarea.addEventListener('mouseup', function() {
      // Update text node width based on textarea size
      const newWidth = textarea.clientWidth;
      const newHeight = textarea.clientHeight;
      
      if (textNode.width() !== newWidth || textNode.height() !== newHeight) {
        textNode.width(newWidth);
        textNode.height(newHeight);
        
        // Update state
        updateOverlay(currentSlide.id, id, {
          width: newWidth,
          height: newHeight
        });
      }
    });
    
    function finishEditing() {
      if (!textNode.getLayer() || !textareaRef.current) return;
      
      // Apply the text and show the node
      textNode.text(textareaRef.current.value);
      
      // Update state
      updateOverlay(currentSlide.id, id, {
        text: textareaRef.current.value
      });
      
      // Clean up
      cleanupTextarea();
      
      // Show the text node
      textNode.show();
      if (transformerRef.current) {
        transformerRef.current.show();
      }
      layerRef.current?.batchDraw();
    }
    
    function cancelEditing() {
      if (!textNode.getLayer()) return;
      
      // Clean up without updating
      cleanupTextarea();
      
      // Show the text node
      textNode.show();
      if (transformerRef.current) {
        transformerRef.current.show();
      }
      layerRef.current?.batchDraw();
    }
    
    // Add event listener for clicks outside
    setTimeout(() => {
      window.addEventListener('mousedown', handleOutsideClick);
    });
  };

  const handleTextChange = (newText: string) => {
    if (!currentSlide || !selectedId) return;
    
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
            // Update width and ensure text rewraps
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
    setShowControls(false);
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
                    onDragMove={handleDragMove}
                    onTransformEnd={(e) => handleTransformEnd(e, overlay.id)}
                    wrap="word"
                    ellipsis={false}
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
        
        {/* Buttons that appear below the text element */}
        {selectedOverlay && selectedOverlay.type === 'text' && !isEditing && (
          <div 
            className="absolute z-10"
            style={{
              left: `${controlsPosition.left}px`,
              top: `${controlsPosition.top}px`,
              transform: 'translate(-50%, 0)'
            }}
          >
            <div className="flex gap-2">
              <button
                className="bg-white shadow-md rounded-full p-2 border border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  const fontSize = Math.max(selectedOverlay.data.fontSize - 2, 8);
                  handleStyleChange('fontSize', fontSize.toString());
                }}
                title="Decrease font size"
              >
                <Minus size={16} className="text-gray-700" />
              </button>
              
              <button
                className="bg-white shadow-md rounded-full p-2 border border-gray-300 hover:bg-gray-50"
                onClick={() => {
                  const fontSize = Math.min(selectedOverlay.data.fontSize + 2, 120);
                  handleStyleChange('fontSize', fontSize.toString());
                }}
                title="Increase font size"
              >
                <Plus size={16} className="text-gray-700" />
              </button>
              
              <button
                className="bg-white shadow-md rounded-full p-2 border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowControls(!showControls)}
                title="Edit text settings"
              >
                <Settings size={16} className="text-gray-700" />
              </button>
              
              <button
                className="bg-red-500 shadow-md rounded-full p-2 border border-red-400 hover:bg-red-600"
                onClick={handleDelete}
                title="Delete text"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
          </div>
        )}
        
        {/* Text Controls Panel */}
        {selectedOverlay && selectedOverlay.type === 'text' && !isEditing && showControls && (
          <div className="fixed z-50 bottom-[90px] left-0 right-0 bg-white border-t shadow-lg p-4">
            <div className="container mx-auto max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <textarea
                    value={selectedOverlay.data.text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="w-full p-2 border rounded-md resize-y h-20 text-black bg-white"
                  />
                  
                  <div className="flex items-center justify-between">
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
                  </div>
                  
                  <div className="flex gap-2">
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
                    
                    <ColorPicker 
                      color={selectedOverlay.data.fill}
                      onChange={(color) => handleStyleChange('fill', color)}
                      label="Text Color"
                      className="ml-auto"
                    />
                  </div>
                </div>
                
                {/* Right Column */}
                <div className="space-y-4">
                  <div>
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
                  
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Width: {Math.round(selectedOverlay.data.width || 200)}px</span>
                    </div>
                    <Slider
                      value={[selectedOverlay.data.width || 200]}
                      min={50}
                      max={width - 20}
                      step={10}
                      onValueChange={(value) => handleStyleChange('width', value[0])}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center">
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
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideCanvas;