const initialState = {
  nodes: [],
  devices: [],
  senders: [],
  receivers: [],
  sources: [],
  flows: [],
  loading: false,
  error: null,
};

const devicesReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_DEVICES_REQUEST': // Kept for potential specific device fetching
    case 'FETCH_RESOURCES_REQUEST': // New action type from App.js
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_DEVICES_SUCCESS': // Kept for potential specific device fetching
      return {
        ...state,
        devices: action.payload, // Assumes payload is an array of devices
        loading: false,
      };
    case 'FETCH_RESOURCES_SUCCESS': // New action type from App.js
      return {
        ...state,
        nodes: action.payload.nodes || [],
        devices: action.payload.devices || [],
        senders: action.payload.senders || [],
        receivers: action.payload.receivers || [],
        sources: action.payload.sources || [],
        flows: action.payload.flows || [],
        loading: false,
      };
    case 'FETCH_DEVICES_FAILURE': // Kept for potential specific device fetching
    case 'FETCH_RESOURCES_FAILURE': // New action type from App.js
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    // Action for WebSocket updates (as seen in App.js)
    // This assumes the payload is a single device object to be updated or added
    case 'UPDATE_DEVICE':
      // Check if the device already exists in the state
      const existingDeviceIndex = state.devices.findIndex(device => device.id === action.payload.id);
      if (existingDeviceIndex !== -1) {
        // Device exists, update it
        const updatedDevices = [...state.devices];
        updatedDevices[existingDeviceIndex] = action.payload;
        return {
          ...state,
          devices: updatedDevices,
        };
      } else {
        // Device is new, add it to the list
        return {
          ...state,
          devices: [...state.devices, action.payload],
        };
      }
    default:
      return state;
  }
};

export default devicesReducer;