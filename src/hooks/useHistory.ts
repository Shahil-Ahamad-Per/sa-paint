import { useState, useCallback, useRef } from "react";

export interface HistoryActions {
  canUndo: boolean;
  canRedo: boolean;
  save: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  undo: (ctx: CanvasRenderingContext2D) => void;
  redo: (ctx: CanvasRenderingContext2D) => void;
  restore: (ctx: CanvasRenderingContext2D, imageData: ImageData) => void;
  clear: () => void;
}

export function useHistory(maxSize: number = 20): HistoryActions {
  const [history, setHistory] = useState<ImageData[]>([]);
  const [step, setStep] = useState(-1);
  const historyRef = useRef(history);
  const stepRef = useRef(step);

  historyRef.current = history;
  stepRef.current = step;

  const canUndo = step > 0;
  const canRedo = step < history.length - 1;

  const save = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const imageData = ctx.getImageData(0, 0, w, h);
      const currentHistory = historyRef.current;
      const currentStep = stepRef.current;

      const newHistory = currentHistory.slice(0, currentStep + 1);
      newHistory.push(imageData);

      if (newHistory.length > maxSize) {
        newHistory.shift();
      }

      setHistory(newHistory);
      setStep(newHistory.length - 1);
    },
    [maxSize],
  );

  const restore = useCallback(
    (ctx: CanvasRenderingContext2D, imageData: ImageData) => {
      ctx.putImageData(imageData, 0, 0);
    },
    [],
  );

  const undo = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const currentHistory = historyRef.current;
      const currentStep = stepRef.current;

      if (currentStep > 0) {
        const newStep = currentStep - 1;
        restore(ctx, currentHistory[newStep]);
        setStep(newStep);
      }
    },
    [restore],
  );

  const redo = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const currentHistory = historyRef.current;
      const currentStep = stepRef.current;

      if (currentStep < currentHistory.length - 1) {
        const newStep = currentStep + 1;
        restore(ctx, currentHistory[newStep]);
        setStep(newStep);
      }
    },
    [restore],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setStep(-1);
  }, []);

  return { canUndo, canRedo, save, undo, redo, restore, clear: clearHistory };
}
