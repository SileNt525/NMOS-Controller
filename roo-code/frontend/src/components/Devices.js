import React, { useEffect } from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

export default function Devices() {
  const dispatch = useDispatch();
  const devices = useSelector((state) => state.devices.devices);
  const loading = useSelector((state) => state.devices.loading);
  const error = useSelector((state) => state.devices.error);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_DEVICES_REQUEST' });
      try {
        const nodes = await fetchNodes();
        const devicesData = await fetchDevices();
        const senders = await fetchSenders();
        const receivers = await fetchReceivers();
        dispatch({ type: 'FETCH_DEVICES_SUCCESS', payload: { nodes, devices: devicesData, senders, receivers } });
      } catch (error) {
        dispatch({ type: 'FETCH_DEVICES_FAILURE', payload: error.message });
      }
    };
    fetchData();
  }, [dispatch]);

  if (loading) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return <Box sx={{ padding: 3 }}><Typography color="error">错误: {error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        设备管理
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>类型</TableCell>
              <TableCell>节点ID</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell component="th" scope="row">
                  {device.id}
                </TableCell>
                <TableCell>{device.label}</TableCell>
                <TableCell>{device.type}</TableCell>
                <TableCell>{device.node_id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}