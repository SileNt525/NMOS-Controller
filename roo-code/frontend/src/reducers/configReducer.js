const initialState = {
  apiEndpoint: 'https://api.example.com',
  pollingInterval: 5000,
  enableNotifications: true,
  theme: 'light',
  customViews: {
    dashboard: {
      layout: 'default',
      visibleWidgets: ['devices', 'connections', 'events']
    }
  }
};

const configReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'UPDATE_CONFIG':
      return {
        ...state,
        ...action.payload
      };
    case 'UPDATE_CUSTOM_VIEW':
      return {
        ...state,
        customViews: {
          ...state.customViews,
          [action.payload.viewName]: {
            ...state.customViews[action.payload.viewName],
            ...action.payload.viewConfig
          }
        }
      };
    default:
      return state;
  }
};

export default configReducer;