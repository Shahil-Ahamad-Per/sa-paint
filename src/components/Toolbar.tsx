import React from 'react';
import { ToolType, BrushType } from '../types';
import {
  Pencil,
  Brush,
  Eraser,
  PaintBucket,
  Minus,
  Square,
  Circle,
  Triangle,
  Type,
  Pipette,
  MousePointer2,
  ChevronDown,
  SprayCan,
  Image as ImageIcon
} from 'lucide-react';

interface ToolbarProps {
  currentTool: ToolType;
  setCurrentTool: (tool: ToolType) => void;
  brushType: BrushType;
  setBrushType: (brush: BrushType) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onImport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  currentTool, setCurrentTool, brushType, setBrushType, strokeWidth, setStrokeWidth, onImport
}) => {
  return (
    <div className="ribbon-group">
      <div className="ribbon-section">
        <div className="ribbon-tools">
          <button className="ribbon-btn large" onClick={onImport} title="Import Image">
            <ImageIcon size={24} />
            <span>Import</span>
          </button>
          <button className={`ribbon-btn ${currentTool === 'selection' ? 'active' : ''}`} onClick={() => setCurrentTool('selection')} title="Selection">
            <MousePointer2 size={18} />
          </button>
        </div>
        <span className="ribbon-label">Image</span>
      </div>

      <div className="ribbon-divider" />

      <div className="ribbon-section">
        <div className="ribbon-tools tool-grid-ribbon">
          <button className={`ribbon-btn ${currentTool === 'pencil' ? 'active' : ''}`} onClick={() => setCurrentTool('pencil')} title="Pencil">
            <Pencil size={18} />
          </button>
          <button className={`ribbon-btn ${currentTool === 'fill' ? 'active' : ''}`} onClick={() => setCurrentTool('fill')} title="Fill with color">
            <PaintBucket size={18} />
          </button>
          <button className={`ribbon-btn ${currentTool === 'text' ? 'active' : ''}`} onClick={() => setCurrentTool('text')} title="Text">
            <Type size={18} />
          </button>
          <button className={`ribbon-btn ${currentTool === 'eraser' ? 'active' : ''}`} onClick={() => setCurrentTool('eraser')} title="Eraser">
            <Eraser size={18} />
          </button>
          <button className={`ribbon-btn ${currentTool === 'eyedropper' ? 'active' : ''}`} onClick={() => setCurrentTool('eyedropper')} title="Color picker">
            <Pipette size={18} />
          </button>
        </div>
        <span className="ribbon-label">Tools</span>
      </div>

      <div className="ribbon-divider" />

      <div className="ribbon-section">
        <div className="dropdown">
          <button className={`ribbon-btn large ${currentTool === 'brush' ? 'active' : ''}`} onClick={() => setCurrentTool('brush')}>
            {brushType === 'spray' ? <SprayCan size={24} /> : <Brush size={24} />}
            <span>Brushes <ChevronDown size={14} /></span>
          </button>
          <div className="dropdown-content">
            <button onClick={() => { setCurrentTool('brush'); setBrushType('normal'); }}>
              <Brush size={16} /> Normal Brush
            </button>
            <button onClick={() => { setCurrentTool('brush'); setBrushType('spray'); }}>
              <SprayCan size={16} /> Spray Can
            </button>
          </div>
        </div>
        <span className="ribbon-label">Brushes</span>
      </div>

      <div className="ribbon-divider" />

      <div className="ribbon-section">
        <div className="ribbon-tools shape-grid">
          <button className={`ribbon-btn ${currentTool === 'line' ? 'active' : ''}`} onClick={() => setCurrentTool('line')}><Minus size={18} /></button>
          <button className={`ribbon-btn ${currentTool === 'rect' ? 'active' : ''}`} onClick={() => setCurrentTool('rect')}><Square size={18} /></button>
          <button className={`ribbon-btn ${currentTool === 'ellipse' ? 'active' : ''}`} onClick={() => setCurrentTool('ellipse')}><Circle size={18} /></button>
          <button className={`ribbon-btn ${currentTool === 'triangle' ? 'active' : ''}`} onClick={() => setCurrentTool('triangle')}><Triangle size={18} /></button>
        </div>
        <span className="ribbon-label">Shapes</span>
      </div>

      <div className="ribbon-divider" />

      <div className="ribbon-section">
        <div className="size-selector">
          <label>Size</label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
          />
          <span className="size-val">{strokeWidth}px</span>
        </div>
        <span className="ribbon-label">Size</span>
      </div>
    </div>
  );
};

export default Toolbar;
