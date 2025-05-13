import React from 'react';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Type
} from 'lucide-react';
import { useSlideContext } from '../context/SlideContext';
import { OverlayType } from '../types';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { Toggle } from './ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface TextOverlayControlsProps {
  overlay: OverlayType;
  position: { x: number; y: number };
}

const TextOverlayControls: React.FC<TextOverlayControlsProps> = ({ overlay, position }) => {
  const { getCurrentSlide, updateOverlay } = useSlideContext();
  const currentSlide = getCurrentSlide();
  
  if (!currentSlide || overlay.type !== 'text') return null;
  
  const handleFontFamilyChange = (fontFamily: string) => {
    updateOverlay(currentSlide.id, overlay.id, { fontFamily });
  };
  
  const handleFontSizeChange = (fontSize: string) => {
    updateOverlay(currentSlide.id, overlay.id, { fontSize: parseInt(fontSize) });
  };
  
  const handleTextAlignChange = (textAlign: string) => {
    updateOverlay(currentSlide.id, overlay.id, { textAlign });
  };
  
  const handleStyleToggle = (style: 'fontWeight' | 'fontStyle') => {
    if (style === 'fontWeight') {
      const newWeight = overlay.data.fontWeight === 'bold' ? 'normal' : 'bold';
      updateOverlay(currentSlide.id, overlay.id, { fontWeight: newWeight });
    } else if (style === 'fontStyle') {
      const newStyle = overlay.data.fontStyle === 'italic' ? 'normal' : 'italic';
      updateOverlay(currentSlide.id, overlay.id, { fontStyle: newStyle });
    }
  };
  
  return (
    <div 
      className="absolute bg-white rounded-lg shadow-lg border p-2 flex gap-1 z-50"
      style={{
        top: position.y + 10,
        left: position.x,
        transform: 'translateX(-50%)'
      }}
    >
      <Select value={overlay.data.fontFamily} onValueChange={handleFontFamilyChange}>
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

      <Select value={overlay.data.fontSize.toString()} onValueChange={handleFontSizeChange}>
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
        onPressedChange={() => handleStyleToggle('fontWeight')}
        size="sm"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        pressed={overlay.data.fontStyle === 'italic'}
        onPressedChange={() => handleStyleToggle('fontStyle')}
        size="sm"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <div className="flex gap-1">
        <Toggle
          pressed={overlay.data.textAlign === 'left'}
          onPressedChange={() => handleTextAlignChange('left')}
          size="sm"
        >
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={overlay.data.textAlign === 'center'}
          onPressedChange={() => handleTextAlignChange('center')}
          size="sm"
        >
          <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={overlay.data.textAlign === 'right'}
          onPressedChange={() => handleTextAlignChange('right')}
          size="sm"
        >
          <AlignRight className="h-4 w-4" />
        </Toggle>
      </div>
    </div>
  );
};

export default TextOverlayControls;