import axios from 'axios';

// API 基础 URL - 将为每个服务分别定义
// 注册服务 (IS-04 resources)
const REGISTRY_SERVICE_URL = process.env.REACT_APP_REGISTRY_API_URL || 'http://localhost:8000';

// 连接管理服务 (IS-05 connections)
const CONNECTION_SERVICE_URL = process.env.REACT_APP_CONNECTION_API_URL || 'http://localhost:8001';

// 事件处理服务 (IS-07 events - 如果有API交互的话，目前主要是WebSocket)
// const EVENT_SERVICE_URL = process.env.REACT_APP_EVENT_API_URL || 'http://localhost:8002';

// 音频映射服务 (IS-08)
const AUDIO_MAPPING_SERVICE_URL = process.env.REACT_APP_AUDIO_MAPPING_API_URL || 'http://localhost:8003';

// --- Axios 实例或辅助函数 ---

// 通用 Axios 实例配置 (如果需要统一配置如 headers)
const baseConfig = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10秒超时
};

// 获取存储的JWT token
const getAuthToken = () => {
  return localStorage.getItem('nmos_jwt_token');
};

// 创建一个 Axios 实例，用于处理需要认证的请求
const createApiClientWithAuth = (baseURL) => {
  const instance = axios.create({
    ...baseConfig,
    baseURL,
  });

  // 添加请求拦截器，自动添加认证头
  instance.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

// 为每个服务创建 Axios 实例
const registryApiClient = createApiClientWithAuth(REGISTRY_SERVICE_URL);
const connectionApiClient = createApiClientWithAuth(CONNECTION_SERVICE_URL);

// const eventApiClient = axios.create({
//   ...baseConfig,
//   baseURL: EVENT_SERVICE_URL,
// });

const audioMappingApiClient = axios.create({
  ...baseConfig,
  baseURL: AUDIO_MAPPING_SERVICE_URL,
});


// --- API 函数 ---

// **注册服务 (NMOS Registry Service - IS-04 related)**
// 注意: 后端 nmos_registry_service/main.py 暴露的是 /resources 端点获取所有资源
// 以及一个 /configure 端点。它不直接暴露 /nmos/is04/* 路径。
// 假设前端需要的 Node, Device, Sender, Receiver 信息都从 /resources 获取并由前端筛选。
// 或者，我们需要在注册服务中实现更细致的 IS-04 路径。
// 为简化，我们假设 /resources 返回所有内容。

// 获取所有 NMOS 资源 (nodes, devices, senders, receivers, etc.)
export const fetchAllNmosResources = async () => {
  const resourceTypes = ['nodes', 'devices', 'sources', 'flows', 'senders', 'receivers'];
  // 动态选择API版本路径，初始尝试使用v1.3
  // 注意：这里的逻辑需要调整，因为后端 /discover 端点不直接代理 NMOS Query API 的 /x-nmos/query/vX.Y/resources/{type} 路径
  // 而是通过 /discover 端点获取所有缓存资源。
  // 因此，我们应该调用 registryApiClient.get('/discover') 或 registryApiClient.get('/resources')
  // 根据后端 main.py 中的端点定义，获取缓存资源是 /resources 端点。
  // 发现资源并更新缓存是 /discover 端点。
  // 假设前端需要的是缓存的资源列表，调用 /resources。

  try {
    const response = await registryApiClient.get('/resources');
    const results = response.data; // response.data 应该是 ResourcesResponse 模型对应的对象
    console.log('Fetched NMOS resources from backend /resources:', results);

    // 后端已经做了版本适配，前端不再需要此逻辑
    // 对获取到的资源进行版本适配
    // for (const type in results) {
    //   if (results[type] && Array.isArray(results[type])) {
    //     results[type].forEach(resource => {
    //       if (type === 'nodes') {
    //         resource.attached_network_device = resource.attached_network_device || null;
    //         resource.authorization = resource.authorization || false;
    //       } else if (type === 'devices') {
    //         resource.authorization = resource.authorization || false;
    //       } else if (type === 'sources' || type === 'flows') {
    //         resource.event_type = resource.event_type || null;
    //       }
    //     });
    //   }
    // }

    // 对获取到的资源进行版本适配
    for (const type in results) {
      if (results[type] && Array.isArray(results[type])) {
        results[type].forEach(resource => {
          if (type === 'nodes') {
            resource.attached_network_device = resource.attached_network_device || null;
            resource.authorization = resource.authorization || false;
          } else if (type === 'devices') {
            resource.authorization = resource.authorization || false;
          } else if (type === 'sources' || type === 'flows') {
            resource.event_type = resource.event_type || null;
          }
        });
      }
    }
  
    return results; // 返回一个包含各类资源数组的对象
  } catch (error) {
    console.error('获取 NMOS 资源失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// 如果需要单独获取 Nodes, Devices 等，可以从 fetchAllNmosResources 的结果中筛选，
// 或者要求后端 nmos_registry_service 提供更具体的端点。
// 以下函数假设从 fetchAllNmosResources 筛选，或者将来后端会提供这些端点。

export const fetchNodes = async () => {
  try {
    // 从 /resources 获取所有资源，然后筛选出 nodes
    const allResources = await fetchAllNmosResources();
    return allResources.nodes || [];
  } catch (error) {
    console.error('获取节点数据失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchDevices = async () => {
  try {
    // 从 /resources 获取所有资源，然后筛选出 devices
    const allResources = await fetchAllNmosResources();
    return allResources.devices || [];
  } catch (error) {
    console.error('获取设备数据失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchSenders = async () => {
  try {
    // 从 /resources 获取所有资源，然后筛选出 senders
    const allResources = await fetchAllNmosResources();
    return allResources.senders || [];
  } catch (error) {
    console.error('获取发送器数据失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchReceivers = async () => {
  try {
    // 从 /resources 获取所有资源，然后筛选出 receivers
    const allResources = await fetchAllNmosResources();
    return allResources.receivers || [];
  } catch (error) {
    console.error('获取接收器数据失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};


// 配置NMOS注册中心
export const configureRegistry = async (address, port) => {
  try {
    const payload = {
      registry_address: address,
      registry_port: port
    };
    const response = await registryApiClient.post('/configure', payload);
    return response.data;
  } catch (error) {
    console.error('配置NMOS注册中心失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// 登录并获取JWT token
export const loginUser = async (username, password) => {
  try {
    // 注意：/token 端点需要 application/x-www-form-urlencoded 格式的数据
    // Axios 可以通过 URLSearchParams 或 FormData 来发送这种格式
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    // 直接使用 axios 实例，不带认证头，因为这是获取 token 的请求本身
    const response = await axios.post(`${REGISTRY_SERVICE_URL}/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const token = response.data.access_token;
    if (token) {
      localStorage.setItem('nmos_jwt_token', token); // 存储 token
      console.log('Login successful, token stored.');
    }
    return response.data; // 返回 token 和 token_type
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    // 清除可能存在的旧 token
    localStorage.removeItem('nmos_jwt_token');
    throw error;
  }
};

// 登出 (清除本地存储的 token)
export const logoutUser = () => {
  localStorage.removeItem('nmos_jwt_token');
  console.log('Logged out, token removed.');
};
 
// **连接管理服务 (NMOS Connection Management Service - IS-05 related)**

// 执行IS-05连接管理 - 创建/更新单个连接
// 后端 connection_management_service/main.py 的端点是 /connect
export const performConnection = async (senderId, receiverId, transportParams, activationMode = "activate_immediate", activationTime = null) => {
  try {
    const payload = {
      sender_id: senderId,
      receiver_id: receiverId,
      transport_params: transportParams, // 应该是数组，例如 [{}] 或更具体的参数
      activation_mode: activationMode,
    };
    if (activationTime && (activationMode === "activate_scheduled_absolute" || activationMode === "activate_scheduled_relative")) {
      payload.activation_time = activationTime;
    }
    // 端点是 /connect
    const response = await connectionApiClient.post('/connect', payload);
    return response.data;
  } catch (error) {
    console.error('执行连接操作失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// 获取 Receiver 的连接状态
// 后端 connection_management_service/main.py 的端点是 /connection_status/{receiver_id}
export const fetchConnectionStatus = async (receiverId) => {
  try {
    // 端点是 /connection_status/{receiver_id}
    const response = await connectionApiClient.get(`/connection_status/${receiverId}`);
    return response.data;
  } catch (error) {
    console.error(`获取 Receiver ${receiverId} 连接状态失败:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

// 执行 IS-05 批量连接
// 后端 connection_management_service/main.py 的端点是 /bulk_connect
export const performBulkConnection = async (connections) => {
  try {
    const payload = { connections }; // { connections: [ { sender_id: ..., receiver_id: ..., ... }, ... ] }
    // 端点是 /bulk_connect
    const response = await connectionApiClient.post('/bulk_connect', payload);
    return response.data;
  } catch (error) {
    console.error('执行批量连接操作失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// **音频映射服务 (Audio Mapping Service - IS-08 related)**

// 获取支持 IS-08 的设备列表
// 后端 audio_mapping_service/main.py 的端点是 /is08-devices
export const fetchIs08Devices = async () => {
  try {
    // 端点是 /is08-devices
    const response = await audioMappingApiClient.get('/is08-devices');
    return response.data; // 期望是 DeviceInfo 对象的列表
  } catch (error) {
    console.error('获取IS-08设备列表失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// 执行音频映射操作
// 后端 audio_mapping_service/main.py 的端点是 /perform-operation
export const performAudioMappingOperation = async (deviceId, operation, params) => {
  try {
    const payload = {
      device_id: deviceId,
      operation: operation,
      params: params,
    };
    // 端点是 /perform-operation
    const response = await audioMappingApiClient.post('/perform-operation', payload);
    return response.data;
  } catch (error) {
    console.error(`在设备 ${deviceId} 上执行音频映射操作 '${operation}' 失败:`, error.response ? error.response.data : error.message);
    throw error;
  }
};


// **事件服务 (Event Handling Service - IS-07 related)**
// 当前事件服务主要是通过 WebSocket 进行通信。
// 如果有需要通过 HTTP API 获取事件规则或订阅列表等，可以在这里添加。
// 例如，如果后端 event_handling_service/main.py 提供了 /rules 端点：
export const fetchEventRules = async () => {
  try {
    // 假设 EVENT_SERVICE_URL 已配置，并且 eventApiClient 已创建
    // const response = await eventApiClient.get('/rules');
    // 由于上面 eventApiClient 被注释掉了，这里先用一个占位符或直接构造
    const eventServiceBaseUrl = process.env.REACT_APP_EVENT_API_URL || 'http://localhost:8002';
    const response = await axios.get(`${eventServiceBaseUrl}/rules`, baseConfig);
    return response.data;
  } catch (error) {
    console.error('获取事件规则失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// 模拟获取拓扑数据的API (在 NetworkTopology.js 中使用 /api/topology)
// 这个端点当前没有在任何后端服务中明确定义。
// 它可能需要从 registry_service 获取所有资源，然后由前端或一个新的后端服务来构建拓扑。
// 为了保持一致，我们假设它将由 registry_service 提供，或者是一个需要将来实现的专用拓扑服务。
// 如果由 registry_service 提供，它可能只是 /resources 的别名或经过处理的版本。
export const fetchTopologyData = async () => {
  try {
    // 假设拓扑数据最终来自注册服务的所有资源
    const response = await registryApiClient.get('/resources'); // 或一个专门的 /topology 端点
    // 在这里，可能需要对 response.data 进行转换以匹配 NetworkTopology 组件期望的格式
    // NetworkTopology 组件期望 { nodes: [], links: [] }
    // 而 /resources 返回 { nodes: [...nmos_nodes], devices: [...], senders: [...], ... }
    // 需要一个转换函数将 NMOS 资源转换为 D3 的节点和链接。
    // 为简单起见，我们只返回原始数据，转换逻辑应在调用方或此函数内部。
    return response.data;
  } catch (error) {
    console.error('获取网络拓扑数据失败:', error.response ? error.response.data : error.message);
    throw error;
  }
};


// 默认导出一个通用的 apiClient 实例可能不再合适，
// 因为我们现在有针对特定服务的实例。
// 但如果某些组件仍在使用它，我们可以保留一个指向主要服务（如注册服务）的实例。
const apiClient = registryApiClient; // 或者选择不导出默认实例
export default apiClient;
