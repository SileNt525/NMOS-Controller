import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Devices from './components/Devices';
import Connections from './components/Connections';
import Events from './components/Events';
import AudioMapping from './components/AudioMapping';
import NetworkTopology from './components/NetworkTopology';
import ConfigurationPanel from './components/ConfigurationPanel';
import Login from './components/Login';
import Navbar from './components/Navbar';
import { Container } from '@mui/material';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    // 初始化WebSocket连接
    const wsClient = new WebSocketClient();
    wsClient.connect();
    
    wsClient.onMessage((data) => {
      // 根据消息类型分发到不同的reducer
      if (data.type === 'DEVICE_UPDATE') {
        dispatch({ type: 'UPDATE_DEVICE', payload: data.payload });
      } else if (data.type === 'CONNECTION_UPDATE') {
        dispatch({ type: 'UPDATE_CONNECTION', payload: data.payload });
      } else if (data.type === 'EVENT_TRIGGER') {
        dispatch({ type: 'ADD_EVENT', payload: data.payload });
      }
    });
    
    return () => {
      wsClient.disconnect();
    };
  }, [dispatch]);

  const handleLogin = (status) => {
    setIsLoggedIn(status);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <Navbar />
      <Container maxWidth="xl" style={{ marginTop: '20px' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/events" element={<Events />} />
          <Route path="/audio-mapping" element={<AudioMapping />} />
          <Route path="/network-topology" element={<NetworkTopology />} />
          <Route path="/configuration" element={<ConfigurationPanel />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;