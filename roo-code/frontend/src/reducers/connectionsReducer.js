const initialState = {
  connections: [],
  loading: false,
  error: null,
};

const connectionsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_CONNECTIONS_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'FETCH_CONNECTIONS_SUCCESS':
      return {
        ...state,
        connections: action.payload,
        loading: false,
      };
    case 'FETCH_CONNECTIONS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'UPDATE_CONNECTION_REQUEST':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'UPDATE_CONNECTION_SUCCESS':
      return {
        ...state,
        loading: false,
      };
    case 'UPDATE_CONNECTION_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

export default connectionsReducer;