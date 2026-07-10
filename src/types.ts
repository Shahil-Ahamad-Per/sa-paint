export type ToolType =
  | 'pencil'
  | 'brush'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'text'
  | 'eyedropper'
  | 'selection';

export type BrushType = 'normal' | 'spray' | 'calligraphy' | 'watercolor' | 'marker' | 'chalk' | 'splatter' | 'pixel';

export type ShapeMode = 'outline' | 'fill' | 'both';

export interface Point {
  x: number;
  y: number;
}
