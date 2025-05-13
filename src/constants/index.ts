import { RatioMap } from '../types';

export const ASPECT_RATIOS: RatioMap = {
  '4:5': {
    ratio: '4:5',
    width: 400,
    height: 500
  },
  '9:16': {
    ratio: '9:16',
    width: 450,
    height: 800
  },
  '3:4': {
    ratio: '3:4',
    width: 450,
    height: 600
  },
  '4:3': {
    ratio: '4:3',
    width: 600,
    height: 450
  },
  '5:4': {
    ratio: '5:4',
    width: 625,
    height: 500
  },
  '16:9': {
    ratio: '16:9',
    width: 800,
    height: 450
  },
  '1:1': {
    ratio: '1:1',
    width: 500,
    height: 500
  }
};

export const FONT_FAMILIES = [
  'Arial',
  'Bungee',
  'DM Serif Display',
  'Fira Sans',
  'Gabarito',
  'Kanit',
  'LEMON MILK',
  'Lilita One',
  'Mont Heavy',
  'Montserrat',
  'Poppins',
  'Roboto',
  'Rubik'
];

export const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

export const DEFAULT_TEXT = 'Click to edit text';

export const DEFAULT_TEXT_STYLE = {
  fontFamily: 'Montserrat',
  fontSize: 36,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'center',
  fill: '#ffffff',
  stroke: '#000000',
  strokeWidth: 0
};

export const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop';