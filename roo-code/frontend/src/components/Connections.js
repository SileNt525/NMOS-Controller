import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Typography, Box, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchAllNmosResources, performConnection } from '../api';
import store from '../store';

// 发送器选择对话框组件
const SenderSelectionDialog = ({ open, onClose, receiverId, currentSenderId, availableSenders, onSenderSelect }) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>选择发送器</DialogTitle>
    <DialogContent>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>发送器 ID</TableCell>
              <TableCell>标签</TableCell>
              <TableCell>设备</TableCell>
              <TableCell>格式</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableSenders.map((sender) => (
              <TableRow key={sender.id} hover>
                <TableCell>{sender.id}</TableCell>
                <TableCell>{sender.label || '未命名'}</TableCell>
                <TableCell>{sender.device_label || sender.device_id || '未知'}</TableCell>
                <TableCell>{sender.format || '未知'}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={sender.id === currentSenderId}
                    onClick={() => onSenderSelect(sender.id)}
                  >
                    选择
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {availableSenders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  没有可用的发送器
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>取消</Button>
    </DialogActions>
  </Dialog>
);

export default function Connections() {
  const dispatch = useDispatch();
  const connections = useSelector((state) => state.connections.connections);
  const loading = useSelector((state) => state.connections.loading);
  const error = useSelector((state) => state.connections.error);
  
  const [senderDialogOpen, setSenderDialogOpen] = useState(false);
  const [selectedReceiverId, setSelectedReceiverId] = useState(null);
  const [availableSenders, setAvailableSenders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dispatch]);

  const fetchData = async () => {
    dispatch({ type: 'FETCH_CONNECTIONS_REQUEST' });
    try {
      const nmosData = await fetchAllNmosResources();
      let derivedConnections = [];
      if (nmosData && nmosData.receivers && Array.isArray(nmosData.receivers)) {
        for (const receiver of nmosData.receivers) {
          if (receiver.subscription && receiver.subscription.active) {
            const sender = nmosData.senders?.find(s => s.id === receiver.subscription.sender_id);
            derivedConnections.push({
              id: receiver.id,
              receiver: receiver.label || receiver.id,
              receiver_details: receiver,
              sender: sender ? (sender.label || sender.id) : receiver.subscription.sender_id,
              sender_details: sender,
              status: sender ? 'active' : 'active_disconnected'
            });
          }
        }
      }
      dispatch({ type: 'FETCH_CONNECTIONS_SUCCESS', payload: derivedConnections });
    } catch (err) {
      dispatch({ type: 'FETCH_CONNECTIONS_FAILURE', payload: err.message });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleUpdateConnection = async (receiverId, currentSenderId, newSenderId) => {
    dispatch({ type: 'UPDATE_CONNECTION_REQUEST' });
    try {
      await performConnection(receiverId, newSenderId);
      dispatch({ type: 'UPDATE_CONNECTION_SUCCESS' });
      await fetchData(); // 重新获取更新后的数据
    } catch (err) {
      dispatch({ type: 'UPDATE_CONNECTION_FAILURE', payload: err.message });
    }
  };

  const showSenderSelectionModal = (receiverId, currentSenderId) => {
    const nmosData = store.getState().nmos;
    const senders = nmosData.senders || [];
    const devices = nmosData.devices || [];
    
    // 为每个发送器添加设备信息
    const enrichedSenders = senders.map(sender => ({
      ...sender,
      device_label: devices.find(d => d.id === sender.device_id)?.label || null
    }));

    setAvailableSenders(enrichedSenders);
    setSelectedReceiverId(receiverId);
    setSenderDialogOpen(true);
  };

  const handleSenderSelect = async (newSenderId) => {
    try {
      await handleUpdateConnection(selectedReceiverId, null, newSenderId);
      setSenderDialogOpen(false);
    } catch (error) {
      console.error('更新连接失败:', error);
    }
  };

  if (loading && !refreshing) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography color="error">错误: {error}</Typography>
        <Button variant="contained" onClick={handleRefresh} style={{ marginTop: 16 }}>
          重试
        </Button>
      </Box>
    );
  }

  const safeConnections = Array.isArray(connections) ? connections : [];

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h4">连接管理</Typography>
        <Tooltip title="刷新">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>接收器</TableCell>
              <TableCell>当前发送器</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeConnections.map((connection) => (
              <TableRow key={connection.id} hover>
                <TableCell>
                  <Tooltip title={`ID: ${connection.id}`}>
                    <span>{connection.receiver}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {connection.sender_details ? (
                    <Tooltip title={`ID: ${connection.sender_details.id}`}>
                      <span>{connection.sender}</span>
                    </Tooltip>
                  ) : (
                    <span style={{ color: 'gray' }}>未连接</span>
                  )}
                </TableCell>
                <TableCell>
                  <Box 
                    component="span" 
                    sx={{
                      display: 'inline-block',
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: connection.status === 'active' ? 'success.light' : 'warning.light',
                      color: 'common.white'
                    }}
                  >
                    {connection.status === 'active' ? '已连接' : '未连接'}
                  </Box>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    style={{ marginRight: 8 }}
                    onClick={() => handleUpdateConnection(connection.id, connection.sender_details?.id, null)}
                  >
                    断开
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={() => showSenderSelectionModal(connection.id, connection.sender_details?.id)}
                  >
                    更改发送器
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {safeConnections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  没有活动的连接
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <SenderSelectionDialog
        open={senderDialogOpen}
        onClose={() => setSenderDialogOpen(false)}
        receiverId={selectedReceiverId}
        currentSenderId={connections.find(c => c.id === selectedReceiverId)?.sender_details?.id}
        availableSenders={availableSenders}
        onSenderSelect={handleSenderSelect}
      />
    </Box>
  );
}