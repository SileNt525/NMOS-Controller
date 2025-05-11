import axios from 'axios';

// API基础URL
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// 创建Axios实例
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 获取IS-04资源 - 节点
export const fetchNodes = async () => {
  try {
    const response = await apiClient.get('/nmos/is04/nodes');
    return response.data;
  } catch (error) {
    console.error('获取节点数据失败:', error);
    throw error;
  }
};

// 获取IS-04资源 - 设备
export const fetchDevices = async () => {
  try {
    const response = await apiClient.get('/nmos/is04/devices');
    return response.data;
  } catch (error) {
    console.error('获取设备数据失败:', error);
    throw error;
  }
};

// 获取IS-04资源 - 发送器
export const fetchSenders = async () => {
  try {
    const response = await apiClient.get('/nmos/is04/senders');
    return response.data;
  } catch (error) {
    console.error('获取发送器数据失败:', error);
    throw error;
  }
};

// 获取IS-04资源 - 接收器
export const fetchReceivers = async () => {
  try {
    const response = await apiClient.get('/nmos/is04/receivers');
    return response.data;
  } catch (error) {
    console.error('获取接收器数据失败:', error);
    throw error;
  }
};

// 执行IS-05连接管理 - 创建连接
export const createConnection = async (senderId, receiverId) => {
  try {
    const response = await apiClient.post('/nmos/is05/connections', {
      sender_id: senderId,
      receiver_id: receiverId,
    });
    return response.data;
  } catch (error) {
    console.error('创建连接失败:', error);
    throw error;
  }
};

// 执行IS-05连接管理 - 更新连接
export const updateConnection = async (connectionId, senderId, receiverId) => {
  try {
    const response = await apiClient.put(`/nmos/is05/connections/${connectionId}`, {
      sender_id: senderId,
      receiver_id: receiverId,
    });
    return response.data;
  } catch (error) {
    console.error('更新连接失败:', error);
    throw error;
  }
};

// 获取连接状态
export const fetchConnections = async () => {
  try {
    const response = await apiClient.get('/nmos/is05/connections');
    return response.data;
  } catch (error) {
    console.error('获取连接数据失败:', error);
    throw error;
  }
};

export default apiClient;