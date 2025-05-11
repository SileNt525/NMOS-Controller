import React, { useEffect } from 'react';
import { Typography, Box, Grid, Card, CardContent, CardHeader, TextField, MenuItem } from '@mui/material';
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
        <TextField
          placeholder="搜索设备..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          sx={{ width: '200px' }}
        />
        <TextField
          select
          variant="outlined"
          size="small"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          sx={{ width: '150px' }}
        >
          <MenuItem value="all">所有类型</MenuItem>
          <MenuItem value="Node">节点</MenuItem>
          <MenuItem value="Device">设备</MenuItem>
        </TextField>
        <TextField
          select
          variant="outlined"
          size="small"
          value={filterConnected}
          onChange={e => setFilterConnected(e.target.value)}
          sx={{ width: '150px' }}
        >
          <MenuItem value="all">所有连接状态</MenuItem>
          <MenuItem value="connected">已连接</MenuItem>
          <MenuItem value="unconnected">未连接</MenuItem>
        </TextField>
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
<Grid item xs={12}>
        <Card>
          <CardHeader title="网络拓扑概览" />
          <CardContent>
            <Box sx={{ width: '100%', height: '300px', border: '1px solid #ccc' }}>
              {/* 这里将嵌入一个简化的网络拓扑图 */}
              <Typography variant="body2" color="text.secondary">
                网络拓扑图将在未来版本中实现。
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      </Grid>
    </Box>
  );
}