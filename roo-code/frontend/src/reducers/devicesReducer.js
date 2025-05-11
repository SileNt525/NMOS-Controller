const initialState = {
  devices: [],
  loading: false,
  error: null,
};

const devicesReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_DEVICES_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_DEVICES_SUCCESS':
      return {
        ...state,
        devices: action.payload,
        loading: false,
      };
    case 'FETCH_DEVICES_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default devicesReducer;