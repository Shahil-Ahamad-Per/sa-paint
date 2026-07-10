import {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  MouseEvent,
  useCallback,
} from "react";
import { ToolType, Point, BrushType, SaveFormat } from "../types";
import { useHistory } from "../hooks/useHistory";
import { useSelection } from "../hooks/useSelection";
import { floodFill } from "../utils/floodFill";
import { saveCanvas } from "../utils/export";
import {
  getEraserCursor,
  getFillCursor,
  getPencilCursor,
  getEyedropperCursor,
} from "../utils/cursors";

export interface CanvasWorkspaceHandle {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  save: (format: SaveFormat) => void;
  loadImage: (file: File) => void;
}

interface CanvasWorkspaceProps {
  currentTool: ToolType;
  brushType: BrushType;
  primaryColor: string;
  secondaryColor: string;
  strokeWidth: number;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
}

const CanvasWorkspace = forwardRef<CanvasWorkspaceHandle, CanvasWorkspaceProps>(
  (
    { currentTool, brushType, primaryColor, secondaryColor, strokeWidth, onHistoryChange },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const tempCanvasRef = useRef<HTMLCanvasElement>(null);
    const tempContextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const sprayIntervalRef = useRef<number | null>(null);

    const [textInput, setTextInput] = useState<{
      x: number;
      y: number;
      value: string;
    } | null>(null);

    const [tempCanvasSize, setTempCanvasSize] = useState({ w: 0, h: 0 });

    const history = useHistory(20);

    const selection = useSelection(
      contextRef.current,
      tempContextRef.current,
      tempCanvasSize.w,
      tempCanvasSize.h,
      () => {
        if (contextRef.current && tempCanvasSize.w > 0) {
          history.save(contextRef.current, tempCanvasSize.w, tempCanvasSize.h);
        }
      },
    );

    useEffect(() => {
      onHistoryChange(history.canUndo, history.canRedo);
    }, [history.canUndo, history.canRedo, onHistoryChange]);

    const getCoordinates = useCallback(
      (e: MouseEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      },
      [],
    );

    const spray = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        color: string,
        radius: number,
      ) => {
        ctx.fillStyle = color;
        const density = radius * 2;
        for (let i = 0; i < density; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.random() * radius;
          const offsetX = Math.cos(angle) * r;
          const offsetY = Math.sin(angle) * r;
          ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
      },
      [],
    );

    const commitSelection = useCallback(() => {
      if (selection.commit()) {
        if (contextRef.current && tempCanvasSize.w > 0) {
          history.save(contextRef.current, tempCanvasSize.w, tempCanvasSize.h);
        }
      }
    }, [selection, history, tempCanvasSize]);

    const handleTextBlur = useCallback(() => {
      if (textInput && textInput.value.trim() !== "") {
        const ctx = contextRef.current;
        if (ctx) {
          const fontSize = Math.max(strokeWidth * 4, 16);
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.fillStyle = primaryColor;
          ctx.textBaseline = "top";
          ctx.fillText(textInput.value, textInput.x, textInput.y);
          history.save(ctx, tempCanvasSize.w, tempCanvasSize.h);
        }
      }
      setTextInput(null);
    }, [textInput, strokeWidth, primaryColor, history, tempCanvasSize]);

    const startDrawing = useCallback(
      (e: MouseEvent<HTMLCanvasElement>) => {
        const { x, y } = getCoordinates(e);
        const isRightClick = e.button === 2;
        const color = isRightClick ? secondaryColor : primaryColor;

        if (currentTool === "text") {
          setTextInput({ x, y, value: "" });
          return;
        }

        if (currentTool === "selection") {
          if (selection.selection?.imageCanvas) {
            const handled = selection.onMouseDown(x, y);
            if (handled) return;

            commitSelection();
            return;
          }
        } else {
          commitSelection();
        }

        if (currentTool === "fill") {
          const ctx = contextRef.current;
          if (ctx) {
            floodFill(ctx, x, y, color, tempCanvasSize.w, tempCanvasSize.h);
            history.save(ctx, tempCanvasSize.w, tempCanvasSize.h);
          }
          return;
        }

        setIsDrawing(true);
        setStartPoint({ x, y });

        const ctx =
          currentTool === "pencil" ||
          currentTool === "brush" ||
          currentTool === "eraser"
            ? contextRef.current
            : tempContextRef.current;

        if (ctx) {
          if (currentTool === "brush" && brushType === "spray") {
            sprayIntervalRef.current = window.setInterval(() => {
              spray(ctx, x, y, color, strokeWidth);
            }, 10);
          } else {
            ctx.beginPath();
            ctx.moveTo(x, y);

            ctx.strokeStyle = currentTool === "eraser" ? "#FFFFFF" : color;
            ctx.lineWidth = strokeWidth;

            if (currentTool === "pencil") {
              ctx.lineWidth = 1;
            }
          }
        }
      },
      [
        getCoordinates,
        secondaryColor,
        primaryColor,
        currentTool,
        selection,
        commitSelection,
        brushType,
        spray,
        strokeWidth,
        floodFill,
        history,
        tempCanvasSize,
      ],
    );

    const draw = useCallback(
      (e: MouseEvent<HTMLCanvasElement>) => {
        const { x, y } = getCoordinates(e);

        if (currentTool === "selection" && selection.selection?.imageCanvas) {
          if (selection.selection.isResizing || selection.selection.isDragging) {
            selection.onMouseMove(x, y);
            return;
          }
        }

        if (!isDrawing) return;
        const isRightClick = e.button === 2;
        const color = isRightClick ? secondaryColor : primaryColor;

        if (
          currentTool === "pencil" ||
          currentTool === "brush" ||
          currentTool === "eraser"
        ) {
          const ctx = contextRef.current;
          if (ctx) {
            if (currentTool === "brush" && brushType === "spray") {
              if (sprayIntervalRef.current) {
                clearInterval(sprayIntervalRef.current);
              }
              spray(ctx, x, y, color, strokeWidth);
              sprayIntervalRef.current = window.setInterval(() => {
                spray(ctx, x, y, color, strokeWidth);
              }, 10);
            } else {
              ctx.lineTo(x, y);
              ctx.stroke();
            }
          }
        } else if (currentTool !== "fill") {
          const tCtx = tempContextRef.current;
          const canvas = tempCanvasRef.current;
          if (tCtx && canvas && startPoint) {
            tCtx.clearRect(0, 0, canvas.width, canvas.height);

            tCtx.beginPath();
            if (currentTool === "line") {
              tCtx.moveTo(startPoint.x, startPoint.y);
              tCtx.lineTo(x, y);
            } else if (currentTool === "rect" || currentTool === "selection") {
              tCtx.rect(
                startPoint.x,
                startPoint.y,
                x - startPoint.x,
                y - startPoint.y,
              );
              if (currentTool === "selection") {
                tCtx.setLineDash([5, 5]);
                tCtx.lineWidth = 1;
                tCtx.strokeStyle = "#3b82f6";
              }
            } else if (currentTool === "ellipse") {
              const radiusX = Math.abs(x - startPoint.x) / 2;
              const radiusY = Math.abs(y - startPoint.y) / 2;
              const centerX = startPoint.x + (x - startPoint.x) / 2;
              const centerY = startPoint.y + (y - startPoint.y) / 2;
              tCtx.ellipse(
                centerX,
                centerY,
                radiusX,
                radiusY,
                0,
                0,
                2 * Math.PI,
              );
            } else if (currentTool === "triangle") {
              tCtx.moveTo(
                startPoint.x + (x - startPoint.x) / 2,
                startPoint.y,
              );
              tCtx.lineTo(startPoint.x, y);
              tCtx.lineTo(x, y);
              tCtx.closePath();
            }
            tCtx.stroke();
            tCtx.setLineDash([]);
          }
        }
      },
      [
        getCoordinates,
        currentTool,
        selection,
        isDrawing,
        secondaryColor,
        primaryColor,
        brushType,
        spray,
        strokeWidth,
        startPoint,
      ],
    );

    const stopDrawing = useCallback(
      (e: MouseEvent<HTMLCanvasElement>) => {
        if (
          currentTool === "selection" &&
          selection.selection &&
          (selection.selection.isDragging || selection.selection.isResizing)
        ) {
          selection.onMouseUp();
          return;
        }

        if (!isDrawing) return;
        setIsDrawing(false);

        if (sprayIntervalRef.current) {
          clearInterval(sprayIntervalRef.current);
          sprayIntervalRef.current = null;
        }

        const { x, y } = getCoordinates(e);

        if (currentTool === "selection" && startPoint) {
          const selX = Math.min(startPoint.x, x);
          const selY = Math.min(startPoint.y, y);
          const selW = Math.abs(x - startPoint.x);
          const selH = Math.abs(y - startPoint.y);

          if (selW > 0 && selH > 0) {
            const ctx = contextRef.current;
            if (ctx) {
              const capturedData = ctx.getImageData(selX, selY, selW, selH);
              ctx.fillStyle = secondaryColor;
              ctx.fillRect(selX, selY, selW, selH);
              selection.setFromImageData(
                capturedData,
                selX,
                selY,
                selW,
                selH,
              );
            }
          } else {
            selection.clear();
          }
          setStartPoint(null);
          return;
        }

        if (
          currentTool !== "pencil" &&
          currentTool !== "brush" &&
          currentTool !== "eraser" &&
          currentTool !== "fill"
        ) {
          const ctx = contextRef.current;
          const tempCanvas = tempCanvasRef.current;
          const tCtx = tempContextRef.current;
          if (ctx && tempCanvas && tCtx) {
            ctx.drawImage(tempCanvas, 0, 0);
            tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          }
        }

        const ctx = contextRef.current;
        if (ctx && (currentTool !== "brush" || brushType !== "spray")) {
          ctx.closePath();
        }

        if (ctx && tempCanvasSize.w > 0) {
          history.save(ctx, tempCanvasSize.w, tempCanvasSize.h);
        }
        setStartPoint(null);
      },
      [
        currentTool,
        selection,
        isDrawing,
        getCoordinates,
        startPoint,
        secondaryColor,
        brushType,
        history,
        tempCanvasSize,
      ],
    );

    const handleContextMenu = useCallback((e: MouseEvent) => {
      e.preventDefault();
    }, []);

    const getCursorStyle = useCallback(() => {
      if (currentTool === "text") return "text";
      if (currentTool === "selection") return "crosshair";
      if (currentTool === "eraser")
        return getEraserCursor(Math.max(strokeWidth, 4));
      if (currentTool === "fill") return getFillCursor();
      if (currentTool === "pencil") return getPencilCursor();
      if (currentTool === "eyedropper") return getEyedropperCursor();
      return "crosshair";
    }, [currentTool, strokeWidth]);

    const handleUndo = useCallback(() => {
      commitSelection();
      if (contextRef.current && tempCanvasSize.w > 0) {
        history.undo(contextRef.current);
      }
    }, [commitSelection, history, tempCanvasSize]);

    const handleRedo = useCallback(() => {
      commitSelection();
      if (contextRef.current && tempCanvasSize.w > 0) {
        history.redo(contextRef.current);
      }
    }, [commitSelection, history, tempCanvasSize]);

    const handleClear = useCallback(() => {
      commitSelection();
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (canvas && ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        history.save(ctx, tempCanvasSize.w, tempCanvasSize.h);
      }
    }, [commitSelection, history, tempCanvasSize]);

    const handleSave = useCallback(
      async (format: SaveFormat) => {
        commitSelection();
        const canvas = canvasRef.current;
        if (canvas) {
          await saveCanvas(canvas, format);
        }
      },
      [commitSelection],
    );

    const handleLoadImage = useCallback(
      (file: File) => {
        commitSelection();
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
              const scale = Math.min(
                canvas.width / img.width,
                canvas.height / img.height,
                1,
              );
              const drawWidth = img.width * scale;
              const drawHeight = img.height * scale;
              const x = (canvas.width - drawWidth) / 2;
              const y = (canvas.height - drawHeight) / 2;

              const offscreen = document.createElement("canvas");
              offscreen.width = drawWidth;
              offscreen.height = drawHeight;
              offscreen
                .getContext("2d")
                ?.drawImage(img, 0, 0, drawWidth, drawHeight);

              selection.setFromImageData(
                offscreen
                  .getContext("2d")!
                  .getImageData(0, 0, drawWidth, drawHeight),
                x,
                y,
                drawWidth,
                drawHeight,
              );
            }
          };
          if (e.target?.result) {
            img.src = e.target.result as string;
          }
        };
        reader.readAsDataURL(file);
      },
      [commitSelection, selection],
    );

    useImperativeHandle(ref, () => ({
      undo: handleUndo,
      redo: handleRedo,
      clear: handleClear,
      save: handleSave,
      loadImage: handleLoadImage,
    }));

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const wrapper = canvas.parentElement;
      if (!wrapper) return;

      const init = () => {
        const w = wrapper.clientWidth || window.innerWidth;
        const h = wrapper.clientHeight || window.innerHeight;

        const tempImg = canvas.toDataURL();

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        contextRef.current = ctx;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);

        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0);
        img.src = tempImg;

        const tempCanvas = tempCanvasRef.current;
        if (tempCanvas) {
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tCtx = tempCanvas.getContext("2d");
          if (tCtx) {
            tCtx.lineCap = "round";
            tCtx.lineJoin = "round";
            tempContextRef.current = tCtx;
          }
        }

        setTempCanvasSize({ w, h });
      };

      init();

      const ro = new ResizeObserver(() => init());
      ro.observe(wrapper);
      return () => ro.disconnect();
    }, []);

    useEffect(() => {
      if (tempCanvasSize.w > 0 && contextRef.current) {
        history.save(contextRef.current, tempCanvasSize.w, tempCanvasSize.h);
      }
    }, [tempCanvasSize]);

    return (
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="main-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onContextMenu={handleContextMenu}
          style={{ cursor: getCursorStyle() }}
        />
        <canvas
          ref={tempCanvasRef}
          className="temp-canvas"
          style={{ pointerEvents: "none" }}
        />

        {textInput && (
          <textarea
            autoFocus
            value={textInput.value}
            onChange={(e) =>
              setTextInput({ ...textInput, value: e.target.value })
            }
            onBlur={handleTextBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleTextBlur();
              }
            }}
            style={{
              position: "absolute",
              left: textInput.x,
              top: textInput.y,
              fontSize: Math.max(strokeWidth * 4, 16) + "px",
              fontFamily: "Inter, sans-serif",
              color: primaryColor,
              background: "transparent",
              border: "1px dashed #666",
              outline: "none",
              minWidth: "50px",
              minHeight: "1.5em",
              overflow: "hidden",
              resize: "none",
              padding: 0,
              margin: 0,
              whiteSpace: "pre",
              lineHeight: 1,
            }}
          />
        )}
      </div>
    );
  },
);

CanvasWorkspace.displayName = "CanvasWorkspace";

export default CanvasWorkspace;
