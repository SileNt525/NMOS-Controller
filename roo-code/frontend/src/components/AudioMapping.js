import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AudioMapping = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [operation, setOperation] = useState('mute');
  const [params, setParams] = useState({ channel: 1 });

  useEffect(() => {
    // 获取支持IS-08的设备列表
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await axios.get('/api/audio_mapping');
      if (response.data.status === 'success') {
        setDevices(response.data.devices);
      }
    } catch (error) {
      console.error('获取设备列表失败:', error);
    }
  };

  const handleDeviceSelect = (device) => {
    setSelectedDevice(device);
  };

  const handleOperationChange = (event) => {
    setOperation(event.target.value);
    // 根据操作类型重置参数
    if (event.target.value === 'mute') {
      setParams({ channel: 1 });
    } else if (event.target.value === 'swap') {
      setParams({ channel1: 1, channel2: 2 });
    } else if (event.target.value === 'reroute') {
      setParams({ sourceChannel: 1, targetChannel: 2 });
    }
  };

  const handleParamChange = (event) => {
    const { name, value } = event.target;
    setParams(prevParams => ({ ...prevParams, [name]: parseInt(value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDevice) return;

    try {
      const response = await axios.post('/api/audio_mapping', {
        device_id: selectedDevice.id,
        operation,
        params
      });
      if (response.data.status === 'success') {
        alert('音频映射操作成功');
      } else {
        alert('操作失败: ' + response.data.message);
      }
    } catch (error) {
      console.error('执行音频映射操作失败:', error);
      alert('操作失败: ' + error.message);
    }
  };

  return (
    <div className="audio-mapping">
      <h2>音频通道映射 (IS-08)</h2>
      <div className="device-list">
        <h3>支持IS-08的设备</h3>
        <ul>
          {devices.map(device => (
            <li 
              key={device.id} 
              onClick={() => handleDeviceSelect(device)}
              className={selectedDevice && selectedDevice.id === device.id ? 'selected' : ''}
            >
              {device.label || device.id}
            </li>
          ))}
        </ul>
      </div>
      {selectedDevice && (
        <div className="operation-form">
          <h3>操作配置 - {selectedDevice.label || selectedDevice.id}</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label>操作类型:</label>
              <select value={operation} onChange={handleOperationChange}>
                <option value="mute">静音 (Mute)</option>
                <option value="swap">交换 (Swap)</option>
                <option value="reroute">重新路由 (Reroute)</option>
              </select>
            </div>
            {operation === 'mute' && (
              <div>
                <label>通道号:</label>
                <input 
                  type="number" 
                  name="channel" 
                  value={params.channel} 
                  onChange={handleParamChange} 
                  min="1"
                />
              </div>
            )}
            {operation === 'swap' && (
              <>
                <div>
                  <label>通道1:</label>
                  <input 
                    type="number" 
                    name="channel1" 
                    value={params.channel1} 
                    onChange={handleParamChange} 
                    min="1"
                  />
                </div>
                <div>
                  <label>通道2:</label>
                  <input 
                    type="number" 
                    name="channel2" 
                    value={params.channel2} 
                    onChange={handleParamChange} 
                    min="1"
                  />
                </div>
              </>
            )}
            {operation === 'reroute' && (
              <>
                <div>
                  <label>源通道:</label>
                  <input 
                    type="number" 
                    name="sourceChannel" 
                    value={params.sourceChannel} 
                    onChange={handleParamChange} 
                    min="1"
                  />
                </div>
                <div>
                  <label>目标通道:</label>
                  <input 
                    type="number" 
                    name="targetChannel" 
                    value={params.targetChannel} 
                    onChange={handleParamChange} 
                    min="1"
                  />
                </div>
              </>
            )}
            <button type="submit">执行操作</button>
          </form>
        </div>
      )}
      <style jsx>{`
        .audio-mapping {
          padding: 20px;
        }
        .device-list {
          margin-bottom: 20px;
        }
        .device-list ul {
          list-style: none;
          padding: 0;
        }
        .device-list li {
          cursor: pointer;
          padding: 5px;
          border-bottom: 1px solid #eee;
        }
        .device-list li.selected {
          background-color: #e6f7ff;
          font-weight: bold;
        }
        .operation-form {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .operation-form div {
          margin-bottom: 10px;
        }
        .operation-form label {
          display: inline-block;
          width: 120px;
        }
        .operation-form input, .operation-form select {
          padding: 5px;
          width: 200px;
        }
        .operation-form button {
          background-color: #1890ff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .operation-form button:hover {
          background-color: #40a9ff;
        }
      `}</style>
    </div>
  );
};

export default AudioMapping;