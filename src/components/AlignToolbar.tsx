import React from "react";
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
} from "lucide-react";

export type AlignDirection =
  | "left"
  | "center-h"
  | "right"
  | "top"
  | "center-v"
  | "bottom";

interface AlignToolbarProps {
  onAlign: (direction: AlignDirection) => void;
}

const alignButtons: {
  direction: AlignDirection;
  icon: React.ElementType;
  title: string;
}[] = [
  { direction: "left", icon: AlignStartVertical, title: "Align Left" },
  {
    direction: "center-h",
    icon: AlignCenterVertical,
    title: "Align Center Horizontally",
  },
  { direction: "right", icon: AlignEndVertical, title: "Align Right" },
  { direction: "top", icon: AlignStartHorizontal, title: "Align Top" },
  {
    direction: "center-v",
    icon: AlignCenterHorizontal,
    title: "Align Center Vertically",
  },
  { direction: "bottom", icon: AlignEndHorizontal, title: "Align Bottom" },
];

const AlignToolbar: React.FC<AlignToolbarProps> = ({ onAlign }) => {
  return (
    <div className="align-toolbar">
      <span className="align-toolbar-label">Align</span>
      <div className="align-toolbar-buttons">
        {alignButtons.map(({ direction, icon: Icon, title }) => (
          <button
            key={direction}
            className="align-toolbar-btn"
            onClick={() => onAlign(direction)}
            title={title}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AlignToolbar;
