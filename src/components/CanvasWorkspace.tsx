import React, { useRef, useEffect, useState, MouseEvent } from 'react';
import { ToolType, Point, BrushType } from '../types';

interface CanvasWorkspaceProps {
  currentTool: ToolType;
  brushType: BrushType;
  primaryColor: string;
  secondaryColor: string;
  strokeWidth: number;
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  setCanvasApi?: (api: {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    save: (format: 'png' | 'jpg' | 'pdf') => void;
    loadImage: (file: File) => void;
  }) => void;
}

interface SelectionState {
  x: number;
  y: number;
  w: number;
  h: number;
  imageCanvas: HTMLCanvasElement | null;
  isDragging: boolean;
  isResizing: boolean;
  resizeHandle: string | null;
  dragStartX: number;
  dragStartY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  currentTool,
  brushType,
  primaryColor,
  secondaryColor,
  strokeWidth,
  onHistoryChange,
  setCanvasApi
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // History state
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);
  const maxHistory = 20;

  // Temp layer
  const tempCanvasRef = useRef<HTMLCanvasElement>(null);
  const tempContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const sprayIntervalRef = useRef<number | null>(null);

  // New tool states
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string } | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Large fixed canvas — browser scroll handles navigation
    const CANVAS_WIDTH = 5000;
    const CANVAS_HEIGHT = 4000;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    contextRef.current = ctx;

    const tempCanvas = tempCanvasRef.current;
    if (tempCanvas) {
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.lineCap = 'round';
        tCtx.lineJoin = 'round';
        tempContextRef.current = tCtx;
      }
    }

    saveState();
  }, []);

  useEffect(() => {
    if (setCanvasApi) {
      setCanvasApi({
        undo: handleUndo,
        redo: handleRedo,
        clear: handleClear,
        save: handleSave,
        loadImage: handleLoadImage
      });
    }
  }, [setCanvasApi, history, historyStep]);

  useEffect(() => {
    onHistoryChange(historyStep > 0, historyStep < history.length - 1);
  }, [historyStep, history.length, onHistoryChange]);

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const handleUndo = () => {
    commitSelection();
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      restoreState(history[newStep]);
      setHistoryStep(newStep);
    }
  };

  const handleRedo = () => {
    commitSelection();
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      restoreState(history[newStep]);
      setHistoryStep(newStep);
    }
  };

  const restoreState = (imageData: ImageData) => {
    const ctx = contextRef.current;
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const handleClear = () => {
    commitSelection();
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      saveState();
    }
  };

  const handleSave = async (format: 'png' | 'jpg' | 'pdf') => {
    commitSelection();

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        pdf.save(`webpaint-${new Date().getTime()}.pdf`);
      } catch (err) {
        console.error('Failed to export PDF:', err);
        alert('Failed to export PDF. Ensure jspdf is installed.');
      }
      return;
    }

    const dataUrl = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
    const link = document.createElement('a');
    link.download = `webpaint-${new Date().getTime()}.${format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadImage = (file: File) => {
    commitSelection();
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const x = (canvas.width - drawWidth) / 2;
          const y = (canvas.height - drawHeight) / 2;
          
          const offscreen = document.createElement('canvas');
          offscreen.width = drawWidth;
          offscreen.height = drawHeight;
          offscreen.getContext('2d')?.drawImage(img, 0, 0, drawWidth, drawHeight);

          // Render it visually on temp canvas immediately
          const tCtx = tempContextRef.current;
          const tempCanvas = tempCanvasRef.current;
          if (tCtx && tempCanvas) {
            tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tCtx.drawImage(offscreen, x, y, drawWidth, drawHeight);
            drawSelectionBorder(tCtx, x, y, drawWidth, drawHeight);
          }

          setSelection({
            x, y, w: drawWidth, h: drawHeight,
            imageCanvas: offscreen,
            isDragging: false, isResizing: false, resizeHandle: null,
            dragStartX: 0, dragStartY: 0, origX: x, origY: y, origW: drawWidth, origH: drawHeight
          });
        }
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const hexToRgba = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
      255
    ] : [0, 0, 0, 255];
  };

  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    const pixelPos = (startY * width + startX) * 4;
    const startR = data[pixelPos];
    const startG = data[pixelPos + 1];
    const startB = data[pixelPos + 2];
    const startA = data[pixelPos + 3];

    const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
      return;
    }

    const tolerance = 64; 
    const matchStartColor = (pos: number) => {
      return Math.abs(data[pos] - startR) <= tolerance && 
             Math.abs(data[pos + 1] - startG) <= tolerance && 
             Math.abs(data[pos + 2] - startB) <= tolerance && 
             Math.abs(data[pos + 3] - startA) <= tolerance;
    };

    const colorPixel = (pos: number) => {
      data[pos] = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = fillA;
    };

    const pixelStack = [[startX, startY]];

    while (pixelStack.length) {
      const newPos = pixelStack.pop() as [number, number];
      const x = newPos[0];
      let y = newPos[1];

      let pixelPos = (y * width + x) * 4;
      while (y-- >= 0 && matchStartColor(pixelPos)) {
        pixelPos -= width * 4;
      }
      pixelPos += width * 4;
      ++y;
      
      let reachLeft = false;
      let reachRight = false;
      
      while (y++ < height - 1 && matchStartColor(pixelPos)) {
        colorPixel(pixelPos);

        if (x > 0) {
          if (matchStartColor(pixelPos - 4)) {
            if (!reachLeft) {
              pixelStack.push([x - 1, y]);
              reachLeft = true;
            }
          } else if (reachLeft) {
            reachLeft = false;
          }
        }

        if (x < width - 1) {
          if (matchStartColor(pixelPos + 4)) {
            if (!reachRight) {
              pixelStack.push([x + 1, y]);
              reachRight = true;
            }
          } else if (reachRight) {
            reachRight = false;
          }
        }

        pixelPos += width * 4;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const getCoordinates = (e: MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const spray = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, radius: number) => {
    ctx.fillStyle = color;
    const density = radius * 2;
    for (let i = 0; i < density; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const offsetX = Math.cos(angle) * r;
      const offsetY = Math.sin(angle) * r;
      ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
    }
  };

  const drawSelectionBorder = (tCtx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    tCtx.setLineDash([5, 5]);
    tCtx.strokeStyle = '#000000';
    tCtx.lineWidth = 1;
    tCtx.strokeRect(x, y, w, h);
    tCtx.setLineDash([]);
    
    // Draw handles
    const size = 6;
    const handles = [
      { id: 'nw', x: x - size/2, y: y - size/2 },
      { id: 'n', x: x + w/2 - size/2, y: y - size/2 },
      { id: 'ne', x: x + w - size/2, y: y - size/2 },
      { id: 'w', x: x - size/2, y: y + h/2 - size/2 },
      { id: 'e', x: x + w - size/2, y: y + h/2 - size/2 },
      { id: 'sw', x: x - size/2, y: y + h - size/2 },
      { id: 's', x: x + w/2 - size/2, y: y + h - size/2 },
      { id: 'se', x: x + w - size/2, y: y + h - size/2 },
    ];
    
    tCtx.fillStyle = '#FFFFFF';
    tCtx.strokeStyle = '#000000';
    handles.forEach(hnd => {
      tCtx.fillRect(hnd.x, hnd.y, size, size);
      tCtx.strokeRect(hnd.x, hnd.y, size, size);
    });
  };

  const getResizeHandle = (x: number, y: number, selX: number, selY: number, w: number, h: number) => {
    const size = 8; // hit area slightly larger than visual box
    const handles = [
      { id: 'nw', x: selX - size/2, y: selY - size/2 },
      { id: 'n', x: selX + w/2 - size/2, y: selY - size/2 },
      { id: 'ne', x: selX + w - size/2, y: selY - size/2 },
      { id: 'w', x: selX - size/2, y: selY + h/2 - size/2 },
      { id: 'e', x: selX + w - size/2, y: selY + h/2 - size/2 },
      { id: 'sw', x: selX - size/2, y: selY + h - size/2 },
      { id: 's', x: selX + w/2 - size/2, y: selY + h - size/2 },
      { id: 'se', x: selX + w - size/2, y: selY + h - size/2 },
    ];
    
    for (const hnd of handles) {
      if (x >= hnd.x && x <= hnd.x + size && y >= hnd.y && y <= hnd.y + size) {
        return hnd.id;
      }
    }
    return null;
  };

  const commitSelection = () => {
    if (selection && selection.imageCanvas) {
      const ctx = contextRef.current;
      const tCtx = tempContextRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (ctx && tCtx && tempCanvas) {
        ctx.drawImage(selection.imageCanvas, selection.x, selection.y, selection.w, selection.h);
        tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        saveState();
      }
    }
    setSelection(null);
  };

  const handleTextBlur = () => {
    if (textInput && textInput.value.trim() !== '') {
      const ctx = contextRef.current;
      if (ctx) {
        const fontSize = Math.max(strokeWidth * 4, 16);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.fillStyle = primaryColor;
        ctx.textBaseline = 'top';
        ctx.fillText(textInput.value, textInput.x, textInput.y);
        saveState();
      }
    }
    setTextInput(null);
  };

  const startDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);
    const isRightClick = e.button === 2;
    const color = isRightClick ? secondaryColor : primaryColor;
    
    if (currentTool === 'text') {
      setTextInput({ x, y, value: '' });
      return;
    }

    if (currentTool === 'selection') {
      if (selection && selection.imageCanvas) {
        // Check for resize handle click
        const handle = getResizeHandle(x, y, selection.x, selection.y, selection.w, selection.h);
        if (handle) {
          setSelection({
            ...selection,
            isResizing: true,
            resizeHandle: handle,
            dragStartX: x, dragStartY: y,
            origX: selection.x, origY: selection.y, origW: selection.w, origH: selection.h
          });
          return;
        }

        // Check for drag click
        if (x >= selection.x && x <= selection.x + selection.w && y >= selection.y && y <= selection.y + selection.h) {
          setSelection({
            ...selection,
            isDragging: true,
            dragStartX: x, dragStartY: y,
            origX: selection.x, origY: selection.y
          });
          return;
        } else {
          commitSelection();
          return;
        }
      }
    } else {
      commitSelection();
    }

    if (currentTool === 'fill') {
      const ctx = contextRef.current;
      if (ctx) {
        floodFill(ctx, x, y, color);
        saveState();
      }
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });

    const ctx = currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser' 
                ? contextRef.current 
                : tempContextRef.current;
    
    if (ctx) {
      if (currentTool === 'brush' && brushType === 'spray') {
        sprayIntervalRef.current = window.setInterval(() => {
          spray(ctx, x, y, color, strokeWidth);
        }, 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        ctx.strokeStyle = currentTool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = strokeWidth;
        
        if (currentTool === 'pencil') {
          ctx.lineWidth = 1;
        }
      }
    }
  };

  const draw = (e: MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);
    
    // Handle Resizing Selection
    if (currentTool === 'selection' && selection && selection.isResizing && selection.imageCanvas) {
      const dx = x - selection.dragStartX;
      const dy = y - selection.dragStartY;
      
      let newX = selection.origX;
      let newY = selection.origY;
      let newW = selection.origW;
      let newH = selection.origH;

      switch (selection.resizeHandle) {
        case 'se': newW += dx; newH += dy; break;
        case 'e': newW += dx; break;
        case 's': newH += dy; break;
        case 'nw': newX += dx; newW -= dx; newY += dy; newH -= dy; break;
        case 'n': newY += dy; newH -= dy; break;
        case 'w': newX += dx; newW -= dx; break;
        case 'ne': newY += dy; newH -= dy; newW += dx; break;
        case 'sw': newX += dx; newW -= dx; newH += dy; break;
      }
      
      // Ensure positive width/height for simplicity (prevent inversion)
      if (newW < 5) newW = 5;
      if (newH < 5) newH = 5;

      const tCtx = tempContextRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (tCtx && tempCanvas) {
        tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(selection.imageCanvas, newX, newY, newW, newH);
        drawSelectionBorder(tCtx, newX, newY, newW, newH);
      }
      
      setSelection({ ...selection, x: newX, y: newY, w: newW, h: newH });
      return;
    }

    // Handle Dragging Selection
    if (currentTool === 'selection' && selection && selection.isDragging && selection.imageCanvas) {
      const dx = x - selection.dragStartX;
      const dy = y - selection.dragStartY;
      
      const newX = selection.origX + dx;
      const newY = selection.origY + dy;
      
      const tCtx = tempContextRef.current;
      const tempCanvas = tempCanvasRef.current;
      if (tCtx && tempCanvas) {
        tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tCtx.drawImage(selection.imageCanvas, newX, newY, selection.w, selection.h);
        drawSelectionBorder(tCtx, newX, newY, selection.w, selection.h);
      }
      
      setSelection({ ...selection, x: newX, y: newY });
      return;
    }

    if (!isDrawing) return;
    const isRightClick = e.button === 2;
    const color = isRightClick ? secondaryColor : primaryColor;

    if (currentTool === 'pencil' || currentTool === 'brush' || currentTool === 'eraser') {
      const ctx = contextRef.current;
      if (ctx) {
        if (currentTool === 'brush' && brushType === 'spray') {
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
    } 
    else if (currentTool !== 'fill') {
      const tCtx = tempContextRef.current;
      const canvas = tempCanvasRef.current;
      if (tCtx && canvas && startPoint) {
        tCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        tCtx.beginPath();
        if (currentTool === 'line') {
          tCtx.moveTo(startPoint.x, startPoint.y);
          tCtx.lineTo(x, y);
        } else if (currentTool === 'rect' || currentTool === 'selection') {
          tCtx.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
          if (currentTool === 'selection') {
            tCtx.setLineDash([5, 5]);
            tCtx.lineWidth = 1;
            tCtx.strokeStyle = '#3b82f6'; 
          }
        } else if (currentTool === 'ellipse') {
          const radiusX = Math.abs(x - startPoint.x) / 2;
          const radiusY = Math.abs(y - startPoint.y) / 2;
          const centerX = startPoint.x + (x - startPoint.x) / 2;
          const centerY = startPoint.y + (y - startPoint.y) / 2;
          tCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        } else if (currentTool === 'triangle') {
          tCtx.moveTo(startPoint.x + (x - startPoint.x) / 2, startPoint.y);
          tCtx.lineTo(startPoint.x, y);
          tCtx.lineTo(x, y);
          tCtx.closePath();
        }
        tCtx.stroke();
        tCtx.setLineDash([]);
      }
    }
  };

  const stopDrawing = (e: MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'selection' && selection && (selection.isDragging || selection.isResizing)) {
      setSelection({ 
        ...selection, 
        isDragging: false, 
        isResizing: false, 
        origX: selection.x, origY: selection.y, origW: selection.w, origH: selection.h 
      });
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (sprayIntervalRef.current) {
      clearInterval(sprayIntervalRef.current);
      sprayIntervalRef.current = null;
    }

    const { x, y } = getCoordinates(e);

    if (currentTool === 'selection' && startPoint) {
      const selX = Math.min(startPoint.x, x);
      const selY = Math.min(startPoint.y, y);
      const selW = Math.abs(x - startPoint.x);
      const selH = Math.abs(y - startPoint.y);

      if (selW > 0 && selH > 0) {
        const ctx = contextRef.current;
        const tCtx = tempContextRef.current;
        const tempCanvas = tempCanvasRef.current;
        if (ctx && tCtx && tempCanvas) {
          const capturedData = ctx.getImageData(selX, selY, selW, selH);
          
          const offscreen = document.createElement('canvas');
          offscreen.width = selW;
          offscreen.height = selH;
          offscreen.getContext('2d')?.putImageData(capturedData, 0, 0);

          ctx.fillStyle = secondaryColor;
          ctx.fillRect(selX, selY, selW, selH);
          
          tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
          tCtx.drawImage(offscreen, selX, selY, selW, selH);
          drawSelectionBorder(tCtx, selX, selY, selW, selH);
          
          setSelection({
            x: selX, y: selY, w: selW, h: selH,
            imageCanvas: offscreen,
            isDragging: false, isResizing: false, resizeHandle: null,
            dragStartX: 0, dragStartY: 0, origX: selX, origY: selY, origW: selW, origH: selH
          });
        }
      } else {
        const tCtx = tempContextRef.current;
        const tempCanvas = tempCanvasRef.current;
        if (tCtx && tempCanvas) tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      setStartPoint(null);
      return;
    }

    if (currentTool !== 'pencil' && currentTool !== 'brush' && currentTool !== 'eraser' && currentTool !== 'fill') {
      const ctx = contextRef.current;
      const tempCanvas = tempCanvasRef.current;
      const tCtx = tempContextRef.current;
      if (ctx && tempCanvas && tCtx) {
        ctx.drawImage(tempCanvas, 0, 0);
        tCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
    }

    const ctx = contextRef.current;
    if (ctx && (currentTool !== 'brush' || brushType !== 'spray')) {
      ctx.closePath();
    }
    
    saveState();
    setStartPoint(null);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const getCursorStyle = () => {
    if (currentTool === 'text') return 'text';
    if (currentTool === 'selection') return selection?.imageCanvas ? 'crosshair' : 'crosshair'; // ideally change based on hover over handles/box, keeping simple for now
    
    if (currentTool === 'eraser') {
      const size = Math.max(strokeWidth, 4);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect x="0.5" y="0.5" width="${size-1}" height="${size-1}" fill="white" stroke="black" stroke-width="1"/></svg>`;
      const encoded = encodeURIComponent(svg);
      return `url('data:image/svg+xml;utf8,${encoded}') ${size/2} ${size/2}, crosshair`;
    }
    
    if (currentTool === 'fill') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="white" stroke-width="5"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></g>
        <g stroke="black" stroke-width="2"><path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/></g>
      </svg>`;
      return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 4 20, crosshair`;
    }
    
    if (currentTool === 'pencil') {
       const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
         <g stroke="white" stroke-width="5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></g>
         <g stroke="black" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></g>
       </svg>`;
       return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 2 22, crosshair`;
    }
    
    if (currentTool === 'eyedropper') {
       const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
         <g stroke="white" stroke-width="5"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></g>
         <g stroke="black" stroke-width="2"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></g>
       </svg>`;
       return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') 2 22, crosshair`;
    }
    
    return 'crosshair';
  };

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
        style={{ pointerEvents: 'none' }}
      />
      
      {textInput && (
        <textarea
          autoFocus
          value={textInput.value}
          onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
          onBlur={handleTextBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleTextBlur();
            }
          }}
          style={{
            position: 'absolute',
            left: textInput.x,
            top: textInput.y,
            fontSize: Math.max(strokeWidth * 4, 16) + 'px',
            fontFamily: 'Inter, sans-serif',
            color: primaryColor,
            background: 'transparent',
            border: '1px dashed #666',
            outline: 'none',
            minWidth: '50px',
            minHeight: '1.5em',
            overflow: 'hidden',
            resize: 'none',
            padding: 0,
            margin: 0,
            whiteSpace: 'pre',
            lineHeight: 1
          }}
        />
      )}
    </div>
  );
};

export default CanvasWorkspace;
