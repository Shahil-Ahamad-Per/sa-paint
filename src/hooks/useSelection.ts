import { useState, useCallback, useRef } from "react";

export interface SelectionState {
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

export interface SelectionActions {
  selection: SelectionState | null;
  onMouseDown: (x: number, y: number) => boolean;
  onMouseMove: (x: number, y: number) => boolean;
  onMouseUp: () => void;
  commit: () => boolean;
  clear: () => void;
  setFromImageData: (
    imageData: ImageData,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
}

function drawSelectionBorder(
  tCtx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  tCtx.setLineDash([5, 5]);
  tCtx.strokeStyle = "#000000";
  tCtx.lineWidth = 1;
  tCtx.strokeRect(x, y, w, h);
  tCtx.setLineDash([]);

  const size = 6;
  const handles = [
    { id: "nw", x: x - size / 2, y: y - size / 2 },
    { id: "n", x: x + w / 2 - size / 2, y: y - size / 2 },
    { id: "ne", x: x + w - size / 2, y: y - size / 2 },
    { id: "w", x: x - size / 2, y: y + h / 2 - size / 2 },
    { id: "e", x: x + w - size / 2, y: y + h / 2 - size / 2 },
    { id: "sw", x: x - size / 2, y: y + h - size / 2 },
    { id: "s", x: x + w / 2 - size / 2, y: y + h - size / 2 },
    { id: "se", x: x + w - size / 2, y: y + h - size / 2 },
  ];

  tCtx.fillStyle = "#FFFFFF";
  tCtx.strokeStyle = "#000000";
  handles.forEach((hnd) => {
    tCtx.fillRect(hnd.x, hnd.y, size, size);
    tCtx.strokeRect(hnd.x, hnd.y, size, size);
  });
}

function getResizeHandle(
  x: number,
  y: number,
  selX: number,
  selY: number,
  w: number,
  h: number,
): string | null {
  const size = 8;
  const handles = [
    { id: "nw", x: selX - size / 2, y: selY - size / 2 },
    { id: "n", x: selX + w / 2 - size / 2, y: selY - size / 2 },
    { id: "ne", x: selX + w - size / 2, y: selY - size / 2 },
    { id: "w", x: selX - size / 2, y: selY + h / 2 - size / 2 },
    { id: "e", x: selX + w - size / 2, y: selY + h / 2 - size / 2 },
    { id: "sw", x: selX - size / 2, y: selY + h - size / 2 },
    { id: "s", x: selX + w / 2 - size / 2, y: selY + h - size / 2 },
    { id: "se", x: selX + w - size / 2, y: selY + h - size / 2 },
  ];

  for (const hnd of handles) {
    if (x >= hnd.x && x <= hnd.x + size && y >= hnd.y && y <= hnd.y + size) {
      return hnd.id;
    }
  }
  return null;
}

export function useSelection(
  mainCtx: CanvasRenderingContext2D | null,
  tempCtx: CanvasRenderingContext2D | null,
  tempCanvasWidth: number,
  tempCanvasHeight: number,
  onCommit?: () => void,
): SelectionActions {
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const renderSelection = useCallback(
    (sel: SelectionState) => {
      if (!tempCtx) return;
      tempCtx.clearRect(0, 0, tempCanvasWidth, tempCanvasHeight);
      if (sel.imageCanvas) {
        tempCtx.drawImage(sel.imageCanvas, sel.x, sel.y, sel.w, sel.h);
      }
      drawSelectionBorder(tempCtx, sel.x, sel.y, sel.w, sel.h);
    },
    [tempCtx, tempCanvasWidth, tempCanvasHeight],
  );

  const onMouseDown = useCallback((x: number, y: number): boolean => {
    const sel = selectionRef.current;
    if (!sel || !sel.imageCanvas) return false;

    const handle = getResizeHandle(x, y, sel.x, sel.y, sel.w, sel.h);
    if (handle) {
      const newSel: SelectionState = {
        ...sel,
        isResizing: true,
        resizeHandle: handle,
        dragStartX: x,
        dragStartY: y,
        origX: sel.x,
        origY: sel.y,
        origW: sel.w,
        origH: sel.h,
      };
      setSelection(newSel);
      selectionRef.current = newSel;
      return true;
    }

    if (x >= sel.x && x <= sel.x + sel.w && y >= sel.y && y <= sel.y + sel.h) {
      const newSel: SelectionState = {
        ...sel,
        isDragging: true,
        dragStartX: x,
        dragStartY: y,
        origX: sel.x,
        origY: sel.y,
      };
      setSelection(newSel);
      selectionRef.current = newSel;
      return true;
    }

    return false;
  }, []);

  const onMouseMove = useCallback(
    (x: number, y: number): boolean => {
      const sel = selectionRef.current;
      if (!sel || !sel.imageCanvas) return false;

      if (sel.isResizing) {
        const dx = x - sel.dragStartX;
        const dy = y - sel.dragStartY;

        let newX = sel.origX;
        let newY = sel.origY;
        let newW = sel.origW;
        let newH = sel.origH;

        switch (sel.resizeHandle) {
          case "se":
            newW += dx;
            newH += dy;
            break;
          case "e":
            newW += dx;
            break;
          case "s":
            newH += dy;
            break;
          case "nw":
            newX += dx;
            newW -= dx;
            newY += dy;
            newH -= dy;
            break;
          case "n":
            newY += dy;
            newH -= dy;
            break;
          case "w":
            newX += dx;
            newW -= dx;
            break;
          case "ne":
            newY += dy;
            newH -= dy;
            newW += dx;
            break;
          case "sw":
            newX += dx;
            newW -= dx;
            newH += dy;
            break;
        }

        if (newW < 5) newW = 5;
        if (newH < 5) newH = 5;

        const newSel: SelectionState = {
          ...sel,
          x: newX,
          y: newY,
          w: newW,
          h: newH,
        };
        renderSelection(newSel);
        setSelection(newSel);
        selectionRef.current = newSel;
        return true;
      }

      if (sel.isDragging) {
        const dx = x - sel.dragStartX;
        const dy = y - sel.dragStartY;
        const newX = sel.origX + dx;
        const newY = sel.origY + dy;

        const newSel: SelectionState = { ...sel, x: newX, y: newY };
        renderSelection(newSel);
        setSelection(newSel);
        selectionRef.current = newSel;
        return true;
      }

      return false;
    },
    [renderSelection],
  );

  const onMouseUp = useCallback(() => {
    const sel = selectionRef.current;
    if (!sel) return;

    if (sel.isDragging || sel.isResizing) {
      const newSel: SelectionState = {
        ...sel,
        isDragging: false,
        isResizing: false,
        origX: sel.x,
        origY: sel.y,
        origW: sel.w,
        origH: sel.h,
      };
      setSelection(newSel);
      selectionRef.current = newSel;
    }
  }, []);

  const commit = useCallback((): boolean => {
    const sel = selectionRef.current;
    if (!sel || !sel.imageCanvas || !mainCtx || !tempCtx) return false;

    mainCtx.drawImage(sel.imageCanvas, sel.x, sel.y, sel.w, sel.h);
    tempCtx.clearRect(0, 0, tempCanvasWidth, tempCanvasHeight);
    setSelection(null);
    selectionRef.current = null;
    onCommit?.();
    return true;
  }, [mainCtx, tempCtx, tempCanvasWidth, tempCanvasHeight, onCommit]);

  const clear = useCallback(() => {
    if (tempCtx) {
      tempCtx.clearRect(0, 0, tempCanvasWidth, tempCanvasHeight);
    }
    setSelection(null);
    selectionRef.current = null;
  }, [tempCtx, tempCanvasWidth, tempCanvasHeight]);

  const setFromImageData = useCallback(
    (imageData: ImageData, x: number, y: number, w: number, h: number) => {
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      offscreen.getContext("2d")?.putImageData(imageData, 0, 0);

      const newSel: SelectionState = {
        x,
        y,
        w,
        h,
        imageCanvas: offscreen,
        isDragging: false,
        isResizing: false,
        resizeHandle: null,
        dragStartX: 0,
        dragStartY: 0,
        origX: x,
        origY: y,
        origW: w,
        origH: h,
      };

      renderSelection(newSel);
      setSelection(newSel);
      selectionRef.current = newSel;
    },
    [renderSelection],
  );

  return {
    selection,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    commit,
    clear,
    setFromImageData,
  };
}
