import React from 'react';
import { AppBar, Toolbar, Typography, Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider } from '@mui/material';
import { Dashboard as DashboardIcon, Devices as DevicesIcon, Link as LinkIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: '仪表盘', icon: <DashboardIcon />, path: '/' },
    { text: '设备', icon: <DevicesIcon />, path: '/devices' },
    { text: '连接', icon: <LinkIcon />, path: '/connections' },
    { text: '事件', icon: <DashboardIcon />, path: '/events' },
    { text: '音频映射', icon: <LinkIcon />, path: '/audio-mapping' },
    { text: '网络拓扑', icon: <DashboardIcon />, path: '/network-topology' },
    { text: '配置面板', icon: <DashboardIcon />, path: '/configuration' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Roo Code - NMOS 控制系统
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>
    </Box>
  );
}