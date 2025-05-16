import React, { useEffect, useState } from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, IconButton } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
// 导入 api.js 中的函数
import { fetchNodes, fetchDevices, fetchSenders, fetchReceivers, fetchAllNmosResources } from '../api';

export default function Devices() {
  const dispatch = useDispatch();
  // 'devices' in Redux store might be just device list, or a more complex object.
  // Let's assume state.devices.devices is an array of device objects.
  // It seems this component aims to display a list of "devices" (NMOS Devices).
  // The fetchData logic also fetches nodes, senders, receivers.
  // The Redux state for devices might need to be structured to hold all these if they are related.
  // For now, we assume `state.devices.devices` is the primary list to display.
  const displayedDeviceList = useSelector((state) => state.devices.devices || []); // Default to empty array
  const loading = useSelector((state) => state.devices.loading);
  const error = useSelector((state) => state.devices.error);

  // Hooks MUST be called at the top level of the component
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('id'); // Default sort by 'id'
  const [order, setOrder] = useState('asc');

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_DEVICES_REQUEST' });
      try {
        // Fetch all resources in one go, then dispatch
        const allNmosData = await fetchAllNmosResources(); 
        // The payload for FETCH_DEVICES_SUCCESS should ideally be just the list of devices.
        // If it needs nodes, senders, receivers, the reducer and state structure must accommodate this.
        // For simplicity, if devicesReducer.js expects { nodes, devices, senders, receivers }:
        // dispatch({ type: 'FETCH_DEVICES_SUCCESS', payload: allNmosData });
        
        // Or, if FETCH_DEVICES_SUCCESS only expects a list of devices:
        dispatch({ type: 'FETCH_DEVICES_SUCCESS', payload: allNmosData.devices || [] });
        
        // If you need nodes, senders, receivers in other parts of Redux store, dispatch separate actions:
        // dispatch({ type: 'FETCH_NODES_SUCCESS', payload: allNmosData.nodes || [] });
        // dispatch({ type: 'FETCH_SENDERS_SUCCESS', payload: allNmosData.senders || [] });
        // dispatch({ type: 'FETCH_RECEIVERS_SUCCESS', payload: allNmosData.receivers || [] });

      } catch (err) { // Renamed error to err
        dispatch({ type: 'FETCH_DEVICES_FAILURE', payload: err.message });
      }
    };
    fetchData();
  }, [dispatch]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Sorting logic - ensure displayedDeviceList is an array and items have properties
  const sortedDevices = React.useMemo(() => {
    if (!Array.isArray(displayedDeviceList)) return [];
    
    // Create a copy before sorting to avoid mutating Redux state directly if `devices` is a direct ref
    const devicesToSort = [...displayedDeviceList];

    return devicesToSort.sort((a, b) => {
      if (!a || !b) return 0; // Handle undefined/null items

      let valA = a[orderBy];
      let valB = b[orderBy];

      // Handle cases where properties might be missing or not strings
      if (typeof valA !== 'string') valA = String(valA === null || valA === undefined ? '' : valA);
      if (typeof valB !== 'string') valB = String(valB === null || valB === undefined ? '' : valB);

      if (orderBy === 'id' || orderBy === 'label' || orderBy === 'type' || orderBy === 'node_id') {
        return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return 0;
    });
  }, [displayedDeviceList, order, orderBy]);


  const handleChangePage = (event, newPage) => { // MUI TablePagination typically passes event first
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => { // MUI TablePagination
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };


  if (loading) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return <Box sx={{ padding: 3 }}><Typography color="error">错误: {error}</Typography></Box>;
  }
  
  // Ensure sortedDevices is an array
  const devicesToDisplay = Array.isArray(sortedDevices) ? sortedDevices : [];
  const currentTablePage = devicesToDisplay.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);


  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        设备管理 (NMOS Devices)
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === 'id' ? order : false} onClick={() => handleRequestSort('id')}>
                ID 
                {orderBy === 'id' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell sortDirection={orderBy === 'label' ? order : false} onClick={() => handleRequestSort('label')}>
                标签 
                {orderBy === 'label' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell sortDirection={orderBy === 'type' ? order : false} onClick={() => handleRequestSort('type')}>
                类型 
                {orderBy === 'type' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell sortDirection={orderBy === 'node_id' ? order : false} onClick={() => handleRequestSort('node_id')}>
                节点ID
                {orderBy === 'node_id' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentTablePage.length === 0 && !loading && (
                 <TableRow>
                    <TableCell colSpan={5} align="center">
                        没有可显示的设备。
                    </TableCell>
                </TableRow>
            )}
            {currentTablePage.map((device) => (
              <TableRow key={device.id}>
                <TableCell component="th" scope="row">
                  {device.id}
                </TableCell>
                <TableCell>{device.label}</TableCell>
                <TableCell>{device.type}</TableCell> {/* This is NMOS Device Type, not node/device/sender etc. */}
                <TableCell>{device.node_id}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" sx={{ mr: 1 }}>详情</Button>
                  <Button variant="outlined" size="small">连接</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Consider using MUI TablePagination for better UX */}
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          onClick={() => handleChangePage(null, page - 1)} // Pass null for event if not used
          disabled={page === 0}
          sx={{ mr: 1 }}
        >
          上一页
        </Button>
        <Typography sx={{ alignSelf: 'center', mx: 2 }}>
          第 {devicesToDisplay.length > 0 ? page + 1 : 0} 页 / {Math.ceil(devicesToDisplay.length / rowsPerPage) || 0}
        </Typography>
        <Button
          onClick={() => handleChangePage(null, page + 1)} // Pass null for event if not used
          disabled={page >= Math.ceil(devicesToDisplay.length / rowsPerPage) - 1}
        >
          下一页
        </Button>
      </Box>
    </Box>
  );
}