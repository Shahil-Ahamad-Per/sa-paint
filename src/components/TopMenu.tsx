import React from 'react';
import { Download, FolderOpen, FilePlus, Undo, Redo, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface TopMenuProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: (format: 'png' | 'jpg' | 'pdf') => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isRibbonOpen: boolean;
  toggleRibbon: () => void;
}

const TopMenu: React.FC<TopMenuProps> = ({
  onNew,
  onOpen,
  onSave,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  isRibbonOpen,
  toggleRibbon
}) => {
  return (
    <div className="top-menu">
      <div className="menu-group">
        <button onClick={onNew} title="New Canvas">
          <FilePlus size={18} />
          <span>New</span>
        </button>
        <button onClick={onOpen} title="Open Image">
          <FolderOpen size={18} />
          <span>Open</span>
        </button>
        <div className="dropdown">
          <button title="Save/Export">
            <Download size={18} />
            <span>Save As</span>
          </button>
          <div className="dropdown-content">
            <button onClick={() => onSave('png')}>PNG Image</button>
            <button onClick={() => onSave('jpg')}>JPG Image</button>
            <button onClick={() => onSave('pdf')}>PDF Document</button>
          </div>
        </div>
      </div>
      <div className="menu-group" style={{marginLeft: 'auto'}}>
        <button onClick={onUndo} disabled={!canUndo} title="Undo">
          <Undo size={18} />
        </button>
        <button onClick={onRedo} disabled={!canRedo} title="Redo">
          <Redo size={18} />
        </button>
        <button onClick={onClear} title="Clear Canvas" className="danger-btn">
          <Trash2 size={18} />
          <span>Clear</span>
        </button>
        
        <div style={{ width: '1px', backgroundColor: '#e5e7eb', margin: '0 8px' }} />
        
        <button onClick={toggleRibbon} title={isRibbonOpen ? "Collapse Ribbon" : "Expand Ribbon"}>
          {isRibbonOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
    </div>
  );
};

export default TopMenu;
