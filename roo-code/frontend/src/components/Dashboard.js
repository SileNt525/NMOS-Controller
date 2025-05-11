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

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        仪表盘
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardHeader title="设备概览" />
            <CardContent>
              <Typography variant="h5" component="div">
                {devices.length}
              </Typography>
              <Typography sx={{ mb: 1.5 }} color="text.secondary">
                已发现的NMOS设备
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