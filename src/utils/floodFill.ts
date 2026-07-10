import { hexToRgba } from "./color";

export const floodFill = (
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  canvasWidth: number,
  canvasHeight: number,
): void => {
  startX = Math.floor(startX);
  startY = Math.floor(startY);

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  const width = canvasWidth;
  const height = canvasHeight;

  const pixelPos = (startY * width + startX) * 4;
  const startR = data[pixelPos];
  const startG = data[pixelPos + 1];
  const startB = data[pixelPos + 2];
  const startA = data[pixelPos + 3];

  const [fillR, fillG, fillB, fillA] = hexToRgba(fillColor);

  if (
    startR === fillR &&
    startG === fillG &&
    startB === fillB &&
    startA === fillA
  ) {
    return;
  }

  const tolerance = 64;
  const matchStartColor = (pos: number) => {
    return (
      Math.abs(data[pos] - startR) <= tolerance &&
      Math.abs(data[pos + 1] - startG) <= tolerance &&
      Math.abs(data[pos + 2] - startB) <= tolerance &&
      Math.abs(data[pos + 3] - startA) <= tolerance
    );
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
