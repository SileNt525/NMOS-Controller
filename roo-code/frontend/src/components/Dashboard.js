import React, { useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardHeader } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

export default function Dashboard() {
  const dispatch = useDispatch();
  const devices = useSelector((state) => state.devices.devices);
  const connections = useSelector((state) => state.connections.connections);

  useEffect(() => {
    // 模拟获取设备和连接数据
    dispatch({ type: 'FETCH_DEVICES_REQUEST' });
    dispatch({ type: 'FETCH_CONNECTIONS_REQUEST' });
    // 在实际应用中，这里会调用API获取数据
  }, [dispatch]);

  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const [filterConnected, setFilterConnected] = React.useState('all');

  const filteredDevices = devices.filter(device => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!device.id.toLowerCase().includes(searchLower) && !device.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (filterType !== 'all' && !device.id.startsWith(filterType)) {
      return false;
    }
    if (filterConnected === 'connected') {
      return connections.some(conn => conn.source.id === device.id || conn.target.id === device.id);
    } else if (filterConnected === 'unconnected') {
      return !connections.some(conn => conn.source.id === device.id || conn.target.id === device.id);
    }
    return true;
  });

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        仪表盘
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <input
          type="text"
          placeholder="搜索设备..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '8px', width: '200px' }}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '8px' }}>
          <option value="all">所有类型</option>
          <option value="Node">节点</option>
          <option value="Device">设备</option>
        </select>
        <select value={filterConnected} onChange={e => setFilterConnected(e.target.value)} style={{ padding: '8px' }}>
          <option value="all">所有连接状态</option>
          <option value="connected">已连接</option>
          <option value="unconnected">未连接</option>
        </select>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader title="设备概览" />
            <CardContent>
              <Typography variant="h5" component="div">
                {filteredDevices.length} / {devices.length}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                已发现的NMOS设备 (过滤后 / 总计)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader title="连接状态" />
            <CardContent>
              <Typography variant="h5" component="div">
                {connections.length}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                活跃连接数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}