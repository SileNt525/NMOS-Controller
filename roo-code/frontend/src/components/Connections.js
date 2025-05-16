import React, { useEffect } from 'react';
import { Typography, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
// 导入 api.js 中的函数
// 假设 fetchConnections 的目的是获取资源以构建连接视图，updateConnection 对应 performConnection
import { fetchAllNmosResources, performConnection, fetchConnectionStatus } from '../api'; // 假设 fetchAllNmosResources 用于获取数据, performConnection 用于更新

export default function Connections() {
  const dispatch = useDispatch();
  // connections 应该是由 reducer 根据 Senders 和 Receivers (特别是 Receivers的 subscription) 组合而成的
  const connections = useSelector((state) => state.connections.connections); 
  const loading = useSelector((state) => state.connections.loading);
  const error = useSelector((state) => state.connections.error);

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_CONNECTIONS_REQUEST' });
      try {
        // 1. 获取所有 NMOS 资源
        const nmosData = await fetchAllNmosResources(); 
        // 2. Dispatch 一个 action，让 reducer 根据这些资源（特别是 receivers 和 senders）
        //    来构建或更新 connections 列表。
        //    例如，一个 connection 可以是 receiver.id 及其 active sender_id。
        //    或者，如果后端 connection_service 提供了 /connections 端点，直接调用那个。
        //    当前 connection_service 没有 /connections 端点，但有 /connection_status/{receiver_id}
        //    为了简化，我们假设 reducer 会处理 nmosData 来填充 state.connections.connections
        //    更合适的做法可能是遍历所有 receivers，调用 fetchConnectionStatus(receiver.id)
        //    或者后端提供一个批量获取所有连接状态的接口。
        
        // 临时的简化：假设 FETCH_CONNECTIONS_SUCCESS action 会处理原始 nmosData
        // 或者，您可以创建一个新的 action 来处理从 nmosData 派生出的 connections。
        // const connectionsData = nmosData; // 传递原始数据，让 reducer 处理
        
        // 一个更实际的获取 "connections" 列表的方法可能是:
        let derivedConnections = [];
        if (nmosData && nmosData.receivers && Array.isArray(nmosData.receivers)) {
            for (const receiver of nmosData.receivers) {
                if (receiver.subscription && receiver.subscription.active && receiver.subscription.sender_id) {
                    const sender = (nmosData.senders && Array.isArray(nmosData.senders)) 
                                   ? nmosData.senders.find(s => s.id === receiver.subscription.sender_id)
                                   : null;
                    derivedConnections.push({
                        id: receiver.id, // Use receiver ID as a unique key for the "connection"
                        receiver: receiver.label || receiver.id,
                        receiver_details: receiver,
                        sender: sender ? (sender.label || sender.id) : receiver.subscription.sender_id,
                        sender_details: sender,
                        status: 'active'
                    });
                } else if (receiver.subscription && receiver.subscription.active && !receiver.subscription.sender_id) {
                     derivedConnections.push({
                        id: receiver.id,
                        receiver: receiver.label || receiver.id,
                        receiver_details: receiver,
                        sender: 'N/A (Active but no sender specified)',
                        sender_details: null,
                        status: 'active_disconnected'
                    });
                }
                // Optionally, include inactive receivers if you want to show all possible connection points
            }
        }
        
        dispatch({ type: 'FETCH_CONNECTIONS_SUCCESS', payload: derivedConnections });
      } catch (err) { // Renamed error to err to avoid conflict with state variable
        dispatch({ type: 'FETCH_CONNECTIONS_FAILURE', payload: err.message });
      }
    };
    fetchData();
  }, [dispatch]);

  const handleUpdateConnection = async (receiverIdToUpdate, currentSenderId, newSenderIdToConnect) => {
    // 这个函数的参数和逻辑需要根据您的 UI 和业务需求来定义
    // "修改" 一个连接通常意味着：
    // 1. 将 Receiver 连接到一个新的 Sender (如果 newSenderIdToConnect 提供)
    // 2. 或者断开 Receiver (将 sender_id 设为 null)
    // 'id' 参数来自 map((connection) => ...)，它可能是 receiver.id
    
    // 假设我们要将 receiverIdToUpdate 连接到 newSenderIdToConnect
    // 并且需要一些默认的 transport_params
    // 在实际应用中，这些值应该从用户输入或配置中获取
    const senderToConnect = newSenderIdToConnect || 'some_default_sender_id_for_update'; // 示例
    const transportParamsForUpdate = [{}]; // 示例：空的 transport_params 数组 (设备会使用默认或缓存的)

    if (!receiverIdToUpdate) {
        console.error("handleUpdateConnection: receiverIdToUpdate is undefined");
        dispatch({ type: 'UPDATE_CONNECTION_FAILURE', payload: "Receiver ID for update is missing." });
        return;
    }

    logger.info(`Attempting to update connection for Receiver: ${receiverIdToUpdate} to new Sender: ${senderToConnect}`);


    try {
      dispatch({ type: 'UPDATE_CONNECTION_REQUEST', payload: { receiverId: receiverIdToUpdate } });
      
      // performConnection(senderId, receiverId, transportParams, activationMode, activationTime)
      const updatedConnectionResult = await performConnection(
        senderToConnect, // The new sender ID (or null to disconnect)
        receiverIdToUpdate,
        transportParamsForUpdate 
        // activationMode and activationTime can be added if needed
      );
      
      // 成功后，理想情况下应该重新获取连接列表或更新 Redux store
      // FETCH_CONNECTIONS_SUCCESS action payload might need to be the full list again,
      // or UPDATE_CONNECTION_SUCCESS could smartly update one item.
      // For now, let's assume a successful PATCH to the device will be reflected via WebSocket updates
      // or a subsequent full fetch.
      dispatch({ type: 'UPDATE_CONNECTION_SUCCESS', payload: updatedConnectionResult }); // payload could be the result from performConnection

      // Trigger a re-fetch of connections to see the update
      // This is a simple way; a more optimized way would be to update the specific connection in Redux store.
      const nmosData = await fetchAllNmosResources();
      let derivedConnections = [];
        if (nmosData && nmosData.receivers && Array.isArray(nmosData.receivers)) {
            for (const receiver of nmosData.receivers) {
                 if (receiver.subscription && receiver.subscription.active && receiver.subscription.sender_id) {
                    const sender = (nmosData.senders && Array.isArray(nmosData.senders)) 
                                   ? nmosData.senders.find(s => s.id === receiver.subscription.sender_id)
                                   : null;
                    derivedConnections.push({
                        id: receiver.id, receiver: receiver.label || receiver.id, sender: sender ? (sender.label || sender.id) : receiver.subscription.sender_id, status: 'active'
                    });
                }
            }
        }
      dispatch({ type: 'FETCH_CONNECTIONS_SUCCESS', payload: derivedConnections });


    } catch (err) { // Renamed error to err
      dispatch({ type: 'UPDATE_CONNECTION_FAILURE', payload: err.message });
    }
  };

  if (loading) {
    return <Box sx={{ padding: 3 }}><Typography>加载中...</Typography></Box>;
  }

  if (error) {
    return <Box sx={{ padding: 3 }}><Typography color="error">错误: {error}</Typography></Box>;
  }

  // Ensure connections is an array before mapping
  const safeConnections = Array.isArray(connections) ? connections : [];

  return (
    <Box sx={{ flexGrow: 1, padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        连接管理
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>接收器 ID (连接点)</TableCell> {/* Changed from ID to be more specific */}
              <TableCell>发送器</TableCell>
              <TableCell>接收器 (详情)</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {safeConnections.map((connection) => (
              <TableRow key={connection.id}> {/* connection.id is likely receiver.id */}
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
                    // Pass relevant IDs to handleUpdateConnection.
                    // This needs a UI way to select a NEW sender. For now, it's a placeholder.
                    onClick={() => handleUpdateConnection(connection.id, connection.sender_details?.id, 'NEW_SENDER_ID_PLACEHOLDER')}
                  >
                    修改
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {safeConnections.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  没有活动的连接。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}