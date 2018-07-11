import EVENTS from '../events.js';
import { cornerstone } from '../externalModules.js';
import triggerEvent from '../util/triggerEvent.js';
import getTool from '../store/getTool.js';

/**
 * Sets a tool's state to 'active'. Active tools are rendered,
 * respond to user input, and can create new data
 *
 * @export
 * @param {*} element
 * @param {*} toolName
 * @param {*} options
 * @returns
 */
const setToolActive = setToolMode.bind(null, 'active', null);

/**
 * Sets a tool's state to 'disabled'. Disabled tools are not rendered,
 * and do not respond to user input
 *
 * @export
 * @param {*} element
 * @param {*} toolName
 * @param {*} options
 * @returns
 */
const setToolDisabled = setToolMode.bind(null, 'disabled', null);

/**
 * Sets a tool's state to 'enabled'. Enabled tools are rendered,
 * but do not respond to user input
 *
 * @export
 * @param {*} element
 * @param {*} toolName
 * @param {*} options
 * @returns
 */
const setToolEnabled = setToolMode.bind(null, 'enabled', null);

/**
 * Sets a tool's state to 'passive'. Passive tools are rendered and respond to user input,
 * but do not create new measurements or annotations.
 *
 * @export
 * @param {*} element
 * @param {*} toolName
 * @param {*} options
 * @returns
 */
const setToolPassive = setToolMode.bind(
  null,
  'passive',
  EVENTS.TOOL_DEACTIVATED
);

/**
 * An internal method that helps make sure we change tool state in a consistent
 * way
 *
 * @param {*} element
 * @param {*} toolName
 * @param {*} options
 * @param {*} mode
 * @param {*} changeEvent
 * @returns
 */
function setToolMode (element, toolName, options, mode, changeEvent) {
  const tool = getTool(element, toolName);

  if (!tool) {
    console.error(`Unable to find tool '${toolName}' for enabledElement`);

    return;
  }

  // Set mode & options
  tool.mode = mode;
  tool.setOptions(options);

  // Call tool's hook for this event, if one exists
  if (tool[`${mode}Callback`]) {
    tool[`${mode}Callback`](element, options);
  }

  // Emit event indicating tool state change
  if (changeEvent) {
    const statusChangeEventData = {
      options,
      toolName,
      type: changeEvent
    };

    triggerEvent(element, changeEvent, statusChangeEventData);
  }

  // Trigger Update
  cornerstone.updateImage(element);
}

export { setToolActive, setToolDisabled, setToolEnabled, setToolPassive };