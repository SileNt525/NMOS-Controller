import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import devicesReducer from './reducers/devicesReducer';
import connectionsReducer from './reducers/connectionsReducer';
import eventsReducer from './reducers/eventsReducer';
import configReducer from './reducers/configReducer';

const rootReducer = combineReducers({
  devices: devicesReducer,
  connections: connectionsReducer,
  events: eventsReducer,
  config: configReducer,
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;