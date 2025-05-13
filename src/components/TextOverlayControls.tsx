import React from 'react';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type,
  Trash2
} from 'lucide-react';
import { useSlideContext } from '../context/SlideContext';
import { OverlayType } from '../types';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { Toggle } from './ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface TextOverlayControlsProps {
  overlay: OverlayType;
  position: { x: number; y: number };
  onDelete: () => void;
}

const TextOverlayControls: React.FC<TextOverlayControlsProps> = ({ 
  overlay, 
  position,
  onDelete 
}) => {
  const { getCurrentSlide, updateOverlay } = useSlideContext();
  const currentSlide = getCurrentSlide();
  
  if (!currentSlide || overlay.type !== 'text') return null;
  
  const handleStyleChange = (property: string, value: any) => {
    if (!currentSlide) return;

    const updates: Partial<OverlayType['data']> = {
      angle: overlay.data.angle,
      scaleX: overlay.data.scaleX,
      scaleY: overlay.data.scaleY
    };

    switch (property) {
      case 'fontFamily':
        updates.fontFamily = value;
        break;
      case 'fontSize':
        updates.fontSize = parseInt(value);
        break;
      case 'fontWeight':
        updates.fontWeight = overlay.data.fontWeight === 'bold' ? 'normal' : 'bold';
        break;
      case 'fontStyle':
        updates.fontStyle = overlay.data.fontStyle === 'italic' ? 'normal' : 'italic';
        break;
      case 'textAlign':
        updates.textAlign = value;
        break;
    }

    updateOverlay(currentSlide.id, overlay.id, updates);
  };
  
  return (
    <div 
      className="fixed z-50 bg-background border rounded-lg shadow-lg p-2 flex gap-2 items-center"
      style={{
        top: position.y,
        left: position.x,
        transform: 'translateX(-50%)'
      }}
    >
      <Select 
        value={overlay.data.fontFamily} 
        onValueChange={(value) => handleStyleChange('fontFamily', value)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            <span className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="truncate">{overlay.data.fontFamily}</span>
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
        value={overlay.data.fontSize.toString()} 
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
        pressed={overlay.data.fontWeight === 'bold'}
        onPressedChange={() => handleStyleChange('fontWeight', null)}
        size="sm"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        pressed={overlay.data.fontStyle === 'italic'}
        onPressedChange={() => handleStyleChange('fontStyle', null)}
        size="sm"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <div className="flex gap-1">
        <Toggle
          pressed={overlay.data.textAlign === 'left'}
          onPressedChange={() => handleStyleChange('textAlign', 'left')}
          size="sm"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={overlay.data.textAlign === 'center'}
          onPressedChange={() => handleStyleChange('textAlign', 'center')}
          size="sm"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={overlay.data.textAlign === 'right'}
          onPressedChange={() => handleStyleChange('textAlign', 'right')}
          size="sm"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
      </div>

      <Toggle
        pressed={false}
        onPressedChange={onDelete}
        size="sm"
        className="text-red-500 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </Toggle>
    </div>
  );
};

export default TextOverlayControls;