import React from "react";

interface ColorPaletteProps {
  primaryColor: string;
  secondaryColor: string;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
}

const standardColors = [
  "#000000",
  "#7F7F7F",
  "#880015",
  "#ED1C24",
  "#FF7F27",
  "#FFF200",
  "#22B14C",
  "#00A2E8",
  "#3F48CC",
  "#A349A4",
  "#FFFFFF",
  "#C3C3C3",
  "#B97A57",
  "#FFAEC9",
  "#FFC90E",
  "#EFE4B0",
  "#B5E61D",
  "#99D9EA",
  "#7092BE",
  "#C8BFE7",
];

const ColorPalette: React.FC<ColorPaletteProps> = ({
  primaryColor,
  secondaryColor,
  setPrimaryColor,
  setSecondaryColor,
}) => {
  return (
    <div className="ribbon-section">
      <div className="color-palette-ribbon">
        <div className="active-colors-ribbon">
          <div className="color-selector">
            <div
              className="color-swatch-large"
              style={{ backgroundColor: primaryColor }}
              title="Color 1"
            />
            <span>Color 1</span>
          </div>
          <div className="color-selector">
            <div
              className="color-swatch-large secondary"
              style={{ backgroundColor: secondaryColor }}
              title="Color 2"
            />
            <span>Color 2</span>
          </div>
        </div>

        <div className="standard-colors-grid">
          {standardColors.map((color) => (
            <div
              key={color}
              className="color-swatch-small"
              style={{ backgroundColor: color }}
              onClick={() => setPrimaryColor(color)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSecondaryColor(color);
              }}
              title={color}
            />
          ))}
        </div>

        <div className="custom-color-picker">
          <label title="Edit Colors">
            <div
              className="edit-colors-icon"
              style={{
                background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
              }}
            ></div>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <span>Edit Colors</span>
          </label>
        </div>
      </div>
      <span className="ribbon-label">Colors</span>
    </div>
  );
};

export default ColorPalette;
