import React, { useState, useEffect } from 'react'; // 新增 useEffect
import { Routes, Route } from 'react-router-dom';
import { useDispatch } from 'react-redux'; // 新增导入
import Dashboard from './components/Dashboard';
import Devices from './components/Devices';
import Connections from './components/Connections';
import Events from './components/Events';
import AudioMapping from './components/AudioMapping';
import NetworkTopology from './components/NetworkTopology';
import ConfigurationPanel from './components/ConfigurationPanel';
import Login from './components/Login';
import Navbar from './components/Navbar';
import { Container, Box } from '@mui/material'; // Box 可能用于布局
import WebSocketClient from './websocket'; // 新增导入

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // 假设默认未登录
  const dispatch = useDispatch(); // 正确获取 dispatch 函数

  useEffect(() => {
    // 初始化WebSocket连接
    const wsClient = new WebSocketClient(); // 使用导入的 WebSocketClient
    wsClient.connect();
    
    wsClient.onMessage((data) => {
      // 根据消息类型分发到不同的reducer
      // 注意：这里的 action types (DEVICE_UPDATE, CONNECTION_UPDATE, ADD_EVENT)
      // 需要与你的 reducers 中定义的 action types 匹配。
      if (data.type === 'DEVICE_UPDATE') {
        // 假设 devicesReducer 中有 'UPDATE_DEVICE' action type
        dispatch({ type: 'UPDATE_DEVICE', payload: data.payload });
      } else if (data.type === 'CONNECTION_UPDATE') {
        // 假设 connectionsReducer 中有 'UPDATE_CONNECTION' action type
        dispatch({ type: 'UPDATE_CONNECTION', payload: data.payload });
      } else if (data.type === 'EVENT_TRIGGER' || data.type === 'NEW_EVENT') { // 'EVENT_TRIGGER' or a more generic 'NEW_EVENT'
        // 假设 eventsReducer 中有 'ADD_EVENT' action type
        dispatch({ type: 'ADD_EVENT', payload: data.payload });
      } else {
        console.log("Received unhandled WebSocket message type: ", data.type);
      }
    });
    
    // 组件卸载时断开 WebSocket 连接
    return () => {
      wsClient.disconnect();
      console.log('WebSocket disconnected on App unmount.');
    };
  }, [dispatch]); // dispatch 通常是稳定的，作为依赖项是安全的

  const handleLogin = (status) => {
    setIsLoggedIn(status);
    if (status) {
      // 用户登录成功后，可能需要获取初始数据
      // 例如: dispatch(fetchInitialDevices());
      // dispatch(fetchInitialConnections());
      console.log("User logged in.");
    } else {
      console.log("User logged out.");
      // 用户登出后，可能需要清理 Redux store 中的数据
      // dispatch({ type: 'CLEAR_USER_DATA' }); // 自定义 action
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    // 使用 Box 组件来确保 Navbar 和 Container 正确布局
    // Navbar 通常是 position: fixed 或者 sticky，内容区需要有相应的 margin-top
    // Navbar 组件内部的 AppBar sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} 暗示了 Drawer 布局
    // 因此 App 组件的根 div 可能需要 display: 'flex'
    <Box sx={{ display: 'flex' }}>
      <Navbar />
      {/* 主内容区，需要考虑 Navbar 的宽度和高度 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // p: 3, // Padding
          marginTop: '64px', // 假设 Navbar (AppBar) 的高度是 64px
          // marginLeft: `240px`, // 如果 Navbar 包含一个固定宽度的 Drawer, Navbar 组件已处理Drawer
          width: '100%', // 确保内容区占据剩余宽度
          overflow: 'auto' // 如果内容过多，允许滚动
        }}
      >
        {/* Container 可以限制最大宽度并居中内容，如果需要的话 */}
        {/* 将 Container 移到 Box 内部，或根据需要调整 */}
        <Container maxWidth="xl" sx={{ paddingTop: 3, paddingBottom: 3 }}> {/* 调整内边距 */}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/events" element={<Events />} />
            <Route path="/audio-mapping" element={<AudioMapping />} />
            <Route path="/network-topology" element={<NetworkTopology />} />
            <Route path="/configuration" element={<ConfigurationPanel />} />
            {/* 可以添加一个 404 页面 */}
            {/* <Route path="*" element={<NotFoundPage />} /> */}
          </Routes>
        </Container>
      </Box>
    </Box>
  );
}

export default App;
