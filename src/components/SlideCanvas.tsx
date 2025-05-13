import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Text, Image, Group, Transformer } from 'react-konva';
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
import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, Trash2 } from 'lucide-react';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import Konva from 'konva';

const SlideCanvas: React.FC = () => {
  const { getCurrentSlide, updateOverlay, deleteOverlay } = useSlideContext();
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [controlsPosition, setControlsPosition] = useState({ top: 0, left: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  
  const currentSlide = getCurrentSlide();

  // Load background image when slide changes
  useEffect(() => {
    if (!currentSlide || currentSlide.background.type !== 'image') {
      setBackgroundImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentSlide.background.value;
    img.onload = () => {
      setBackgroundImage(img);
    };
  }, [currentSlide?.id, currentSlide?.background.value, currentSlide?.background.type]);

  // Attach transformer to selected node
  useEffect(() => {
    if (!selectedId || !transformerRef.current || !stageRef.current) return;

    const stage = stageRef.current;
    const transformer = transformerRef.current;
    
    // Find the node by id
    const selectedNode = stage.findOne('#' + selectedId);
    
    if (selectedNode) {
      // Attach transformer to the node
      transformer.nodes([selectedNode as Konva.Node]);
      transformer.getLayer()?.batchDraw();

      // Update controls position
      updateControlsPosition(selectedNode as Konva.Node);
    } else {
      // No selected node, clear transformer
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  const updateControlsPosition = (node: Konva.Node) => {
    if (!stageRef.current || !node) return;
    
    const stage = stageRef.current;
    
    // Get absolute position on the page
    const stageBox = stage.container().getBoundingClientRect();
    const box = node.getClientRect();
    
    setControlsPosition({
      top: stageBox.top + box.y + box.height + 10,
      left: stageBox.left + box.x + box.width / 2
    });
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    
    // Find the current overlay
    if (currentSlide) {
      const overlay = currentSlide.overlays.find(o => o.id === id);
      if (overlay && overlay.type === 'text') {
        updateControlsPosition(stageRef.current?.findOne('#' + id) as Konva.Node);
      }
    }
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
    
    const node = e.target;
    
    // Get the updated properties after transformation
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    
    // Update state with new transformation data
    updateOverlay(currentSlide.id, id, {
      angle: rotation,
      scaleX: scaleX,
      scaleY: scaleY,
      width: node.width() * scaleX,
      height: node.height() * scaleY,
      position: {
        x: node.x(),
        y: node.y()
      }
    });

    // Update control position
    updateControlsPosition(node);
  };

  const handleTextDblClick = (e: Konva.KonvaEventObject<MouseEvent>, id: string) => {
    if (!currentSlide) return;
    
    const textNode = e.target as Konva.Text;
    
    // Enable text editing
    textNode.hide();
    transformerRef.current?.hide();
    
    // Create a textarea for editing
    const textPosition = textNode.absolutePosition();
    const stageBox = stageRef.current?.container().getBoundingClientRect();
    
    if (!stageBox) return;
    
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y
    };
    
    // Create textarea
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    textarea.value = textNode.text();
    textarea.style.position = 'absolute';
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() * textNode.scaleX()}px`;
    textarea.style.height = `${textNode.height() * textNode.scaleY()}px`;
    textarea.style.fontSize = `${textNode.fontSize() * textNode.scaleY()}px`;
    textarea.style.border = '1px solid black';
    textarea.style.padding = '5px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'white';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.textAlign = textNode.align();
    textarea.style.color = textNode.fill();
    
    textarea.focus();
    
    setIsEditing(true);
    
    textarea.addEventListener('keydown', function(e) {
      // On enter without shift, complete editing
      if (e.key === 'Enter' && !e.shiftKey) {
        textNode.text(textarea.value);
        removeTextarea();
        
        // Update state
        updateOverlay(currentSlide.id, id, {
          text: textarea.value
        });
      }
      
      // On escape, cancel editing
      if (e.key === 'Escape') {
        removeTextarea();
      }
    });
    
    textarea.addEventListener('blur', function() {
      textNode.text(textarea.value);
      removeTextarea();
      
      // Update state
      updateOverlay(currentSlide.id, id, {
        text: textarea.value
      });
    });
    
    function removeTextarea() {
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener('click', handleOutsideClick);
      textNode.show();
      transformerRef.current?.show();
      layerRef.current?.batchDraw();
      setIsEditing(false);
    }
    
    function handleOutsideClick(e: MouseEvent) {
      if (e.target !== textarea) {
        textNode.text(textarea.value);
        removeTextarea();
      }
    }
    
    setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
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
    const textNode = stageRef.current?.findOne('#' + selectedId) as Konva.Text;
    if (textNode) {
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
      }
      
      // Update the layer
      layerRef.current?.batchDraw();
      
      // Update transformer
      transformerRef.current?.forceUpdate();
      
      // Update controls position
      updateControlsPosition(textNode);
    }
  };

  const handleDelete = () => {
    if (!currentSlide || !selectedId) return;
    
    // Delete overlay from state
    deleteOverlay(currentSlide.id, selectedId);
    
    // Clear selection
    setSelectedId(null);
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
              <Image
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
                    {...textConfig}
                    onClick={() => handleSelect(overlay.id)}
                    onDblClick={(e) => handleTextDblClick(e, overlay.id)}
                    onDragEnd={(e) => handleDragEnd(e, overlay.id)}
                    onTransformEnd={(e) => handleTransformEnd(e, overlay.id)}
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
                'top-left', 'top-right', 
                'bottom-left', 'bottom-right',
                'middle-left', 'middle-right'
              ]}
              rotateEnabled={true}
              resizeEnabled={true}
            />
          </Layer>
        </Stage>
        
        {/* Text controls */}
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