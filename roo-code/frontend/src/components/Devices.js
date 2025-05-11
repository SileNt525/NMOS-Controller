import React, { useEffect, useState } from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, IconButton } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';

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

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('id');
  const [order, setOrder] = useState('asc');

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedDevices = devices.sort((a, b) => {
    if (orderBy === 'id') {
      return order === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    } else if (orderBy === 'label') {
      return order === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label);
    } else if (orderBy === 'type') {
      return order === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
    }
    return 0;
  });

  const handleChangePage = (newPage) => {
    setPage(newPage);
  };

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        设备管理
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell onClick={() => handleRequestSort('id')}>
                ID {orderBy === 'id' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell onClick={() => handleRequestSort('label')}>
                标签 {orderBy === 'label' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell onClick={() => handleRequestSort('type')}>
                类型 {orderBy === 'type' && (order === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />)}
              </TableCell>
              <TableCell>节点ID</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedDevices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((device) => (
              <TableRow key={device.id}>
                <TableCell component="th" scope="row">
                  {device.id}
                </TableCell>
                <TableCell>{device.label}</TableCell>
                <TableCell>{device.type}</TableCell>
                <TableCell>{device.node_id}</TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" sx={{ mr: 1 }}>详情</Button>
                  <Button variant="outlined" size="small">连接</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button
          onClick={() => handleChangePage(page - 1)}
          disabled={page === 0}
          sx={{ mr: 1 }}
        >
          上一页
        </Button>
        <Button
          onClick={() => handleChangePage(page + 1)}
          disabled={page >= Math.ceil(devices.length / rowsPerPage) - 1}
        >
          下一页
        </Button>
      </Box>
    </Box>
  );
}