import { useState, useRef, useEffect } from "react";
import TopMenu from "./components/TopMenu";
import Toolbar from "./components/Toolbar";
import ColorPalette from "./components/ColorPalette";
import CanvasWorkspace, {
  CanvasWorkspaceHandle,
} from "./components/CanvasWorkspace";
import { ToolType, BrushType } from "./types";

function App() {
  const [currentTool, setCurrentTool] = useState<ToolType>("brush");
  const [brushType, setBrushType] = useState<BrushType>("normal");
  const [primaryColor, setPrimaryColor] = useState<string>("#000000");
  const [secondaryColor, setSecondaryColor] = useState<string>("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState<number>(5);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [isRibbonOpen, setIsRibbonOpen] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<CanvasWorkspaceHandle>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          canvasRef.current?.undo();
        } else if (e.key === "y") {
          e.preventDefault();
          canvasRef.current?.redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleNew = () => {
    window.open(window.location.href, "_blank");
  };

  const handleOpen = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      canvasRef.current?.loadImage(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearConfirm = () => {
    canvasRef.current?.clear();
    setIsClearModalOpen(false);
  };

  return (
    <div className="app-container">
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <TopMenu
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={(format) => canvasRef.current?.save(format)}
        onUndo={() => canvasRef.current?.undo()}
        onRedo={() => canvasRef.current?.redo()}
        onClear={() => setIsClearModalOpen(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        isRibbonOpen={isRibbonOpen}
        toggleRibbon={() => setIsRibbonOpen(!isRibbonOpen)}
      />
      <div className={`ribbon-container ${isRibbonOpen ? "" : "collapsed"}`}>
        <div className="ribbon">
          <Toolbar
            currentTool={currentTool}
            setCurrentTool={setCurrentTool}
            brushType={brushType}
            setBrushType={setBrushType}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            onImport={handleOpen}
          />
          <div className="ribbon-divider" />
          <ColorPalette
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            setPrimaryColor={setPrimaryColor}
            setSecondaryColor={setSecondaryColor}
          />
        </div>
      </div>
      <div className="main-content">
        <div className="workspace-container">
          <CanvasWorkspace
            ref={canvasRef}
            currentTool={currentTool}
            brushType={brushType}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            strokeWidth={strokeWidth}
            onHistoryChange={(undoable, redoable) => {
              setCanUndo(undoable);
              setCanRedo(redoable);
            }}
          />
        </div>
      </div>

      {isClearModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsClearModalOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Clear Canvas?</h2>
            <p>
              Are you sure you want to clear the canvas? This will wipe your
              current drawing.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn cancel"
                onClick={() => setIsClearModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn confirm"
                onClick={handleClearConfirm}
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
