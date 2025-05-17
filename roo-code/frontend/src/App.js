import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Devices from './components/Devices';
import Connections from './components/Connections';
import Events from './components/Events';
import NetworkTopology from './components/NetworkTopology';
import Settings from './components/Settings';
import { fetchAllNmosResources, updateConnectionState } from './reducers/nmosReducer';
import { addEvent } from './reducers/eventsReducer'; // Import addEvent action
import WebSocketClient from './websocket';
import './App.css';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initial fetch of all NMOS resources
    dispatch(fetchAllNmosResources());

    // Initialize WebSocket connection
    // The URL should ideally come from a config or environment variable
    const wsClient = new WebSocketClient('ws://localhost:3001/ws'); // Assuming backend WebSocket is on port 3001

    wsClient.onMessage((event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket Message Received:', message);

        // Dispatch actions based on message type
        // These message types should align with what the backend (event_handling_service) sends
        switch (message.type) {
          case 'NEW_NMOS_EVENT': // For IS-07 events to be logged
            // The payload should be the event object itself
            dispatch(addEvent(message.payload)); 
            break;
          case 'CONNECTION_STATUS_UPDATE': // For IS-05 connection changes
            // Payload could be { receiver_id, active: { sender_id, master_enable } } or similar
            // Or simply a notification to re-fetch if detailed updates are complex
            console.log('Connection status update received:', message.payload);
            // Option 1: Dispatch an action to update a specific connection in Redux state
            // This requires nmosReducer to handle such an action.
            // dispatch(updateSingleConnection(message.payload)); 
            // Option 2: Re-fetch all resources to ensure UI consistency.
            // This is simpler but might be less efficient for frequent updates.
            dispatch(fetchAllNmosResources());
            // Option 3: If the backend sends the full updated receiver stage, update it directly
            if (message.payload && message.payload.receiver_id && message.payload.active_connection) {
                dispatch(updateConnectionState({
                    receiverId: message.payload.receiver_id,
                    active: message.payload.active_connection // {sender_id, master_enable}
                }));
            } else {
                // Fallback if payload structure is different
                dispatch(fetchAllNmosResources());
            }
            break;
          case 'DEVICE_UPDATE': // For IS-04 device list changes (e.g., new device registered)
            console.log('Device list update received, re-fetching all NMOS resources.');
            dispatch(fetchAllNmosResources());
            break;
          // Add more cases for other types of WebSocket messages as needed
          default:
            console.log('Received unhandled WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    // Cleanup WebSocket connection when the component unmounts
    return () => {
      wsClient.close();
    };
  }, [dispatch]);

  return (
    <Router>
      <div className="App">
        <nav>
          <ul>
            <li><Link to="/">仪表盘</Link></li>
            <li><Link to="/devices">设备管理</Link></li>
            <li><Link to="/connections">连接管理</Link></li>
            <li><Link to="/topology">网络拓扑</Link></li>
            <li><Link to="/events">事件与规则</Link></li>
            <li><Link to="/settings">系统设置</Link></li>
          </ul>
        </nav>
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/topology" element={<NetworkTopology />} />
            <Route path="/events" element={<Events />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
