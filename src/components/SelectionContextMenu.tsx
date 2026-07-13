import React, { useEffect, useRef } from "react";
import { BringToFront, SendToBack, Trash2 } from "lucide-react";

interface SelectionContextMenuProps {
  x: number;
  y: number;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const SelectionContextMenu: React.FC<SelectionContextMenuProps> = ({
  x,
  y,
  onBringToFront,
  onSendToBack,
  onDelete,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    // Slight delay so the initial right click doesn't close it instantly
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      <button onClick={() => { onBringToFront(); onClose(); }}>
        <BringToFront size={16} />
        <span>Bring to Front</span>
      </button>
      <button onClick={() => { onSendToBack(); onClose(); }}>
        <SendToBack size={16} />
        <span>Send to Back</span>
      </button>
      <div className="context-menu-divider" />
      <button className="danger" onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={16} />
        <span>Delete</span>
      </button>
    </div>
  );
};

export default SelectionContextMenu;
