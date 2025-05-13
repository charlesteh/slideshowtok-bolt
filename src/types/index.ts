import Konva from 'konva';

export interface SlideType {
  id: string;
  background: {
    type: 'color' | 'image';
    value: string;
  };
  aspectRatio: AspectRatioType;
  overlays: OverlayType[];
}

export interface OverlayType {
  id: string;
  type: 'text';
  data: {
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fontStyle: string;
    textAlign: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    angle?: number;
    scaleX?: number;
    scaleY?: number;
    width?: number;
    height?: number;
    position?: {
      x: number;
      y: number;
    };
  };
  position?: {
    x: number;
    y: number;
  };
}

export type AspectRatioType = '4:5' | '9:16' | '3:4' | '4:3' | '5:4' | '16:9' | '1:1';

export interface AspectRatioConfig {
  ratio: AspectRatioType;
  width: number;
  height: number;
}

export interface RatioMap {
  [key: string]: AspectRatioConfig;
}