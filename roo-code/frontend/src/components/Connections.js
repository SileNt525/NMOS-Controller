import React, { useEffect } from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

export default function Connections() {
  const dispatch = useDispatch();
  const connections = useSelector((state) => state.connections.connections);
  const loading = useSelector((state) => state.connections.loading);
  const error = useSelector((state) => state.connections.error);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_CONNECTIONS_REQUEST' });
      try {
        const connectionsData = await fetchConnections();
        dispatch({ type: 'FETCH_CONNECTIONS_SUCCESS', payload: connectionsData });
      } catch (error) {
        dispatch({ type: 'FETCH_CONNECTIONS_FAILURE', payload: error.message });
      }
    };
    fetchData();
  }, [dispatch]);

  const handleUpdateConnection = async (id) => {
    try {
      dispatch({ type: 'UPDATE_CONNECTION_REQUEST', payload: id });
      // 假设我们有新的发送器和接收器ID，在实际应用中这些值应该从用户输入中获取
      const newSenderId = 'sender_id'; // 替换为实际值
      const newReceiverId = 'receiver_id'; // 替换为实际值
      const updatedConnection = await updateConnection(id, newSenderId, newReceiverId);
      dispatch({ type: 'UPDATE_CONNECTION_SUCCESS', payload: updatedConnection });
    } catch (error) {
      dispatch({ type: 'UPDATE_CONNECTION_FAILURE', payload: error.message });
    }
  };

  if (loading) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return <Box sx={{ padding: 3 }}><Typography color="error">错误: {error}</Typography></Box>;
  }

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        连接管理
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>发送器</TableCell>
              <TableCell>接收器</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {connections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell component="th" scope="row">
                  {connection.id}
                </TableCell>
                <TableCell>{connection.sender}</TableCell>
                <TableCell>{connection.receiver}</TableCell>
                <TableCell>{connection.status}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleUpdateConnection(connection.id)}
                  >
                    修改
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}