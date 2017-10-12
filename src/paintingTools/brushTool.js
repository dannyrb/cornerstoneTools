import { external } from '../externalModules.js';
import { getToolState, addToolState } from '../stateManagement/toolState.js';
import mouseButtonTool from '../imageTools/mouseButtonTool.js';
import isMouseButtonEnabled from '../util/isMouseButtonEnabled.js';

// This module is for creating segmentation overlays

export default function (brushToolInterface) {
  const toolType = brushToolInterface.toolType;
  let brushLayerId = brushToolInterface.brushLayerId;

  function newImageCallback (e, eventData) {
    const element = eventData.element;
    const toolData = getToolState(element, toolType);
    let pixelData;

    if (toolData) {
      pixelData = toolData.data[0].pixelData;
    } else {
      pixelData = new Uint8ClampedArray(eventData.image.width * eventData.image.height);
      addToolState(element, toolType, { pixelData });
    }

    const layer = external.cornerstone.getLayer(eventData.element, brushLayerId);

    layer.image.setPixelData(pixelData);
    layer.invalid = true;

    external.cornerstone.updateImage(element);
  }

  function mouseMoveCallback (e, eventData) {
    brushToolInterface.onMouseMove(e, eventData);
  }

  function mouseUpCallback (e, eventData) {
    brushToolInterface.onMouseUp(e, eventData);

    external.$(eventData.element).off('CornerstoneToolsMouseDrag', mouseMoveCallback);
    external.$(eventData.element).off('CornerstoneToolsMouseDrag', dragCallback);
    external.$(eventData.element).off('CornerstoneToolsMouseUp', mouseUpCallback);
    external.$(eventData.element).off('CornerstoneToolsMouseClick', mouseUpCallback);
  }

  function dragCallback (e, eventData) {
    brushToolInterface.onDrag(e, eventData);

    return false;
  }

  function mouseDownActivateCallback (e, eventData) {
    if (isMouseButtonEnabled(eventData.which, e.data.mouseButtonMask)) {
      external.$(eventData.element).on('CornerstoneToolsMouseDrag', dragCallback);
      external.$(eventData.element).on('CornerstoneToolsMouseUp', mouseUpCallback);
      external.$(eventData.element).on('CornerstoneToolsMouseClick', mouseUpCallback);
      brushToolInterface.onMouseDown(e, eventData);

      return false;
    }

    external.$(eventData.element).on('CornerstoneToolsMouseDrag', mouseMoveCallback);
    external.$(eventData.element).on('CornerstoneToolsMouseUp', mouseUpCallback);
  }

  function activate (element, mouseButtonMask) {
    external.$(element).off('CornerstoneImageRendered', brushToolInterface.onImageRendered);
    external.$(element).on('CornerstoneImageRendered', brushToolInterface.onImageRendered);

    const eventData = {
      mouseButtonMask
    };

    external.$(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);
    external.$(element).on('CornerstoneToolsMouseDownActivate', eventData, mouseDownActivateCallback);

    external.$(element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
    external.$(element).on('CornerstoneToolsMouseMove', mouseMoveCallback);

    external.$(element).off('CornerstoneNewImage', newImageCallback);
    external.$(element).on('CornerstoneNewImage', newImageCallback);

    const enabledElement = external.cornerstone.getEnabledElement(element);
    const { width, height } = enabledElement.image;
    let pixelData = new Uint8ClampedArray(width * height);
    const colormapId = 'BrushColorMap';
    const colormap = external.cornerstone.colors.getColormap(colormapId);

    colormap.setNumberOfColors(3);
    colormap.setColor(0, [0, 0, 0, 0]);
    colormap.setColor(1, [255, 0, 0, 255]);
    colormap.setColor(2, [0, 255, 0, 255]);
    colormap.setColor(3, [255, 255, 0, 255]);

    const labelMapImage = {
      minPixelValue: 0,
      maxPixelValue: 1,
      slope: 1.0,
      intercept: 0,
      getPixelData: () => pixelData,
      rows: enabledElement.image.height,
      columns: enabledElement.image.width,
      height,
      width,
      pixelData,
      setPixelData: (data) => {
        pixelData = data;
      },
      colormap,
      color: false,
      rgba: false,
      labelmap: true,
      invert: false,
      columnPixelSpacing: 1.0,
      rowPixelSpacing: 1.0,
      sizeInBytes: enabledElement.image.width * enabledElement.image.height
    };

    let layer;
    const options = {
      viewport: {
        pixelReplication: true
      }
    };

    if (brushLayerId) {
      layer = external.cornerstone.getLayer(element, brushLayerId);
    }

    if (!layer) {
      brushLayerId = external.cornerstone.addLayer(element, labelMapImage, options);
    }

    addToolState(element, brushToolInterface.toolType, { pixelData });

    const configuration = brushTool.getConfiguration();

    configuration.brushLayerId = brushLayerId;
    brushTool.setConfiguration(configuration);

    external.cornerstone.updateImage(element);
  }

  function deactivate (element) {
    external.$(element).off('CornerstoneImageRendered', brushToolInterface.onImageRendered);
    external.$(element).off('CornerstoneToolsMouseDownActivate', mouseDownActivateCallback);
    external.$(element).off('CornerstoneToolsMouseMove', mouseMoveCallback);
    external.$(element).off('CornerstoneNewImage', newImageCallback);
  }

  const brushTool = mouseButtonTool({
    mouseMoveCallback,
    mouseDownActivateCallback,
    onImageRendered: brushToolInterface.onImageRendered,
    deactivate
  });

  brushTool.activate = activate;

  return brushTool;
}
