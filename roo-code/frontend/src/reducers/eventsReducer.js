import { fetchEventRules as apiFetchEventRules } from '../api'; // Renamed to avoid conflict

const initialState = {
  events: [], // For live event log via WebSocket
  rules: [],  // For configured event rules
  loading: false,
  error: null,
};

const eventsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_EVENT_RULES_REQUEST':
      return { ...state, loading: true, error: null };
    case 'FETCH_EVENT_RULES_SUCCESS':
      return {
        ...state,
        loading: false,
        rules: action.payload,
      };
    case 'FETCH_EVENT_RULES_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_EVENT': // For WebSocket live events
      return {
        ...state,
        // Add new event to the beginning of the array, and keep a max number of events if needed
        events: [action.payload, ...state.events.slice(0, 199)], // Example: keep latest 200 events
      };
    case 'ADD_RULE_SUCCESS': // Assuming updateRule in component dispatches this after API call
      return {
        ...state,
        rules: [...state.rules, action.payload],
      };
    case 'ADD_RULE_FAILURE':
        // Handle error when adding a rule, e.g., show a notification
        console.error("Failed to add rule:", action.payload);
        return state;
    default:
      return state;
  }
};

// Action creator to fetch event rules from the backend
export const fetchEventRules = () => {
  return async dispatch => {
    dispatch({ type: 'FETCH_EVENT_RULES_REQUEST' });
    try {
      const rules = await apiFetchEventRules(); // Call the API function from api.js
      dispatch({ type: 'FETCH_EVENT_RULES_SUCCESS', payload: rules });
    } catch (error) {
      dispatch({ type: 'FETCH_EVENT_RULES_FAILURE', payload: error.message });
    }
  };
};

// Action creator for adding a new event (typically from WebSocket)
export const addEvent = (eventData) => {
  return {
    type: 'ADD_EVENT',
    payload: eventData, // eventData should be the structured event object
  };
};

// Action creator for updating/adding a rule
// This might involve an API call to the backend to persist the rule.
// For now, it just updates the local Redux state.
// TODO: Implement API call to backend to save the rule, then dispatch ADD_RULE_SUCCESS or ADD_RULE_FAILURE.
export const addRule = (rule) => {
  // Placeholder for API call to save the rule
  // For example: 
  // return async dispatch => {
  //   try {
  //     const response = await apiSaveEventRule(rule); // A new function in api.js
  //     dispatch({ type: 'ADD_RULE_SUCCESS', payload: response.data });
  //   } catch (error) {
  //     dispatch({ type: 'ADD_RULE_FAILURE', payload: error.message });
  //   }
  // };
  
  // For now, directly dispatching success for local update
  return {
    type: 'ADD_RULE_SUCCESS', // Changed from UPDATE_RULE to be more specific
    payload: rule,
  };
};

export default eventsReducer;