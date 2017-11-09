import { external } from '../externalModules.js';
import { getToolState } from '../stateManagement/toolState.js';
import brushTool from './brushTool.js';

// This module is for creating segmentation overlays
const toolType = 'brush';
const configuration = {
  draw: 1,
  radius: 3,
  hoverColor: 'green',
  dragColor: 'yellow',
  overlayColor: 'red'
};

const HOVER_LABEL = 2;
let lastImageCoords;

function drawBrush (x, y, radius, brushPixelValue, storedPixels, imageRows, imageColumns) {
  if (x < 0 || x > imageColumns ||
      y < 0 || y > imageRows) {
    return;
  }

  const xCenter = Math.round(x - radius / 2);
  const yCenter = Math.round(y - radius / 2);

  const brushWidth = radius;
  const brushHeight = radius;

  for (let row = 0; row < brushHeight; row++) {
    for (let column = 0; column < brushWidth; column++) {
      const spIndex = ((row + yCenter) * imageColumns) + (column + xCenter);

      storedPixels[spIndex] = brushPixelValue;
    }
  }
}

function paint (eventData) {
  const configuration = brush.getConfiguration();
  const element = eventData.element;
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const { rows, columns } = layer.image;
  const { x, y } = eventData.currentPoints.image;
  const toolData = getToolState(element, toolType);
  const brushData = toolData.data[0];

  drawBrush(x, y, configuration.radius, configuration.draw, brushData.pixelData, rows, columns);
  layer.invalid = true;

  external.cornerstone.updateImage(element);
}

function onMouseDown (e, eventData) {
  paint(eventData);
  lastImageCoords = eventData.currentPoints.image;
}

function onMouseUp (e, eventData) {
  lastImageCoords = eventData.currentPoints.image;
}

function onMouseMove (e, eventData) {
  lastImageCoords = eventData.currentPoints.image;

  // Get all the information we need to draw the brush
  const configuration = brush.getConfiguration();
  const radius = configuration.radius;
  const element = eventData.element;
  const toolData = getToolState(element, toolType);
  const brushData = toolData.data[0];
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const { rows, columns } = layer.image;
  const { x, y } = lastImageCoords;

  if (x > 0 && x < columns && y > 0 && y < rows) {
    console.log('hovering, drawing green box');
    // First, copy the current pixel data into a backup array
    const hoverData = new Uint8ClampedArray(brushData.pixelData);

    // Draw the hover overlay on top of the pixel data
    drawBrush(x, y, radius, HOVER_LABEL, hoverData, rows, columns);
    layer.invalid = true;

    // Reset the pixel data to the backed-up version
    layer.image.setPixelData(hoverData);

    external.cornerstone.updateImage(element);
  } else {
    console.log('not hovering?');
  }
}

function onDrag (e, eventData) {
  paint(eventData);
  lastImageCoords = eventData.currentPoints.image;
}

function onImageRendered (e, eventData) {
  const configuration = brush.getConfiguration();
  const element = eventData.element;
  const layer = external.cornerstone.getLayer(element, configuration.brushLayerId);
  const toolData = getToolState(element, toolType);
  const brushData = toolData.data[0];

  layer.image.setPixelData(brushData.pixelData);
}

const brush = brushTool({
  onMouseMove,
  onMouseDown,
  onMouseUp,
  onDrag,
  toolType,
  onImageRendered
});

brush.setConfiguration(configuration);

export { brush };
