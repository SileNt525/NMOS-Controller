const initialState = {
  events: [],
  rules: []
};

const eventsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_EVENTS_SUCCESS':
      return {
        ...state,
        events: action.payload
      };
    case 'UPDATE_RULE':
      return {
        ...state,
        rules: [...state.rules, action.payload]
      };
    default:
      return state;
  }
};

export const fetchEvents = () => {
  return async dispatch => {
    // TODO: Implement API call to fetch events from backend
    const mockEvents = [
      { timestamp: '2025-05-12 00:41:00', deviceId: 'device_1', type: 'tally_change', details: 'State: on' }
    ];
    dispatch({ type: 'FETCH_EVENTS_SUCCESS', payload: mockEvents });
  };
};

export const updateRule = (rule) => {
  return {
    type: 'UPDATE_RULE',
    payload: rule
  };
};

export default eventsReducer;