import { external } from '../externalModules.js';
import { getToolState } from '../stateManagement/toolState.js';
import brushTool from './brushTool.js';

// This module is for creating segmentation overlays
const toolType = 'adaptiveBrush';
const configuration = {
  draw: 1,
  radius: 3,
  tolerance: 50,
  border: 1,
  minRadius: 1,
  hoverColor: 'green',
  dragColor: 'yellow',
  overlayColor: 'red'
};

let lastImageCoords;
let thrMax;
let thrMin;

function getCircle (radius) {
  const circleArray = [];

  const distance = (x, y) => Math.sqrt(y * y + x * x);
  const filled = (x, y, radius) => distance(x, y) <= radius - 1;
  const fatfilled = (x, y, radius) => (filled(x, y, radius) && !(
    filled(x + 1, y, radius) &&
        filled(x - 1, y, radius) &&
        filled(x, y + 1, radius) &&
        filled(x, y - 1, radius) &&
        filled(x + 1, y + 1, radius) &&
        filled(x + 1, y - 1, radius) &&
        filled(x - 1, y - 1, radius) &&
        filled(x - 1, y + 1, radius)
  )) ||

    (!filled(x, y, radius) &&
        filled(x + 1, y - 1, radius) &&
             filled(x + 1, y, radius) &&
             filled(x + 1, y + 1, radius)) ||

    (!filled(x, y, radius) && filled(x - 1, y - 1, radius) &&
             filled(x - 1, y, radius) &&
             filled(x - 1, y + 1, radius)) ||

    (!filled(x, y, radius) && filled(x + 1, y + 1, radius) &&
             filled(x, y + 1, radius) &&
             filled(x - 1, y + 1, radius)) ||

    (!filled(x, y, radius) && filled(x + 1, y - 1, radius) &&
             filled(x, y - 1, radius) &&
             filled(x - 1, y - 1, radius));

  let index = 0;

  for(let y = -radius + 1; y < radius; y++) {
    for(let x = -radius + 1; x < radius; x++) {
      const xfilled = fatfilled(x, y, radius, 1);

      if (xfilled) {
        circleArray[index] = [];
        circleArray[index][0] = y;
        circleArray[index][1] = x;
        index++;
      }
    }
  }

  return circleArray;
}

function getGreyValues (x, y, pointerArray, pixelData, imageRows, imageColumns) {
  const configuration = adaptiveBrush.getConfiguration();
  const tolerance = configuration.tolerance;
  const xCoord = Math.round(x);
  const yCoord = Math.round(y);
  let minValue = Number.MAX_VALUE;
  let maxValue = -Number.MAX_VALUE;

  for (let i = 0; i < pointerArray.length; i++) {
    const circleCoordY = yCoord + pointerArray[i][0];
    const circleCoordX = xCoord + pointerArray[i][1];
    const pixelIndex = circleCoordY * imageColumns + circleCoordX;
    const greyValue = pixelData[pixelIndex];

    minValue = Math.min(greyValue, minValue);
    maxValue = Math.max(greyValue, maxValue);
  }

  thrMin = minValue - tolerance;
  thrMax = maxValue + tolerance;
}

// Draws the pointer with overlap calculation - Used on mouse clicked
function paintAdaptiveBrush (imagePixelData, brushPixelData, rows, columns) {
  const configuration = adaptiveBrush.getConfiguration();
  const mouseX = Math.round(lastImageCoords.x);
  const mouseY = Math.round(lastImageCoords.y);
  const brushPixelValue = configuration.draw;

  const paintIfInBounds = (arr, xCoord, yCoord, brushPixelData, brushPixelValue, rows, columns) => {
    for (let i = 0; i < arr.length; i++) {
      const xCoord = arr[i][1] + mouseX;
      const yCoord = arr[i][0] + mouseY;

      // Otherwise, fill in the pixel at this coordinate
      paintSinglePixel(xCoord, yCoord, brushPixelData, brushPixelValue, rows, columns);
    }
  };

  let numPixelsOutsideThresholdWindow;
  let pointerArray = [];
  let radius = configuration.radius;

  /*
   * Find pixels within the brush area. If within the brush area there are pixels outside the threshold min / max,
   * decrease the brush radius until there are no sub/supra threshold pixels left (or until you reach the minimum radius).
   */
  while (numPixelsOutsideThresholdWindow !== 0 && radius > configuration.minRadius) {
    numPixelsOutsideThresholdWindow = 0;
    pointerArray = getCircle(radius);

    // Loop through each of the relative pixel coordinates for the brush
    for (let j = 0; j < pointerArray.length; j++) {
      // Calculate the x / y image coordinates using the brush and the current mouse position
      const yCoord = pointerArray[j][0] + mouseY;
      const xCoord = pointerArray[j][1] + mouseX;

      // If these coordinates are outside the image, skip this piece of the brush
      if (xCoord < 0 || yCoord < 0 || xCoord > columns || yCoord > rows) {
        continue;
      }

      // Otherwise, retrieve the image pixel value in this location
      const pixelIndex = yCoord * columns + xCoord;
      const pixelValue = imagePixelData[pixelIndex];

      /*
        If the image pixel value is outside of the thresholds,
        increase the numPixelsOutsideThresholdWindow counter
      */
      if (pixelValue > thrMax || pixelValue < thrMin) {
        numPixelsOutsideThresholdWindow++;
        break;
      }
    }

    if (numPixelsOutsideThresholdWindow > 0) {
      radius--;
    }
  }

  if (!numPixelsOutsideThresholdWindow) {
    paintIfInBounds(pointerArray, mouseX, mouseY, brushPixelData, brushPixelValue, rows, columns);
  }
}

function paintSinglePixel (x, y, pixelData, brushPixelValue, imageRows, imageColumns) {
  if (x < 0 || x > imageColumns ||
      y < 0 || y > imageRows) {
    return;
  }

  const pixelIndex = y * imageColumns + x;

  pixelData[pixelIndex] = brushPixelValue;
}

function paint (eventData) {
  const configuration = adaptiveBrush.getConfiguration();
  const element = eventData.element;
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const baseLayer = external.cornerstone.getLayers(element)[0];
  const { rows, columns } = layer.image;
  const toolData = getToolState(element, toolType);
  const brushData = toolData.data[0];

  paintAdaptiveBrush(baseLayer.image.getPixelData(), brushData.pixelData, rows, columns);
  layer.invalid = true;

  external.cornerstone.updateImage(element);
}

function onMouseDown (e, eventData) {
  lastImageCoords = eventData.currentPoints.image;
  const element = eventData.element;
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const baseLayer = external.cornerstone.getLayers(element)[0];
  const { x, y } = eventData.currentPoints.image;
  const { rows, columns } = layer.image;
  const pointerArray = getCircle(configuration.radius, configuration.border);

  getGreyValues(x, y, pointerArray, baseLayer.image.getPixelData(), rows, columns);
  paint(eventData);
}

function onMouseUp (e, eventData) {
  lastImageCoords = eventData.currentPoints.image;
}

function onMouseMove (e, eventData) {
  lastImageCoords = eventData.currentPoints.image;
  const element = eventData.element;

  external.cornerstone.updateImage(element);
}

function onDrag (e, eventData) {
  paint(eventData);
  lastImageCoords = eventData.currentPoints.image;
}

function onImageRendered (e, eventData) {
  const configuration = adaptiveBrush.getConfiguration();
  const element = eventData.element;
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const toolData = getToolState(element, toolType);
  const brushData = toolData.data[0];

  layer.image.setPixelData(brushData.pixelData);
}

const adaptiveBrush = brushTool({
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onDrag,
  toolType,
  onImageRendered
});

adaptiveBrush.setConfiguration(configuration);

export { adaptiveBrush };
