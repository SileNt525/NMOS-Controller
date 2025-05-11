import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AudioMapping = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [operation, setOperation] = useState('mute');
  const [params, setParams] = useState({ channel: 1 });
  const [operationHistory, setOperationHistory] = useState([]);

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

    // 验证通道号是否在设备支持的范围内
    if (operation === 'mute' && params.channel > selectedDevice.channelCount) {
      alert(`通道号超出设备支持的范围（1-${selectedDevice.channelCount}）`);
      return;
    }
    if (operation === 'swap' && (params.channel1 > selectedDevice.channelCount || params.channel2 > selectedDevice.channelCount)) {
      alert(`通道号超出设备支持的范围（1-${selectedDevice.channelCount}）`);
      return;
    }
    if (operation === 'reroute' && (params.sourceChannel > selectedDevice.channelCount || params.targetChannel > selectedDevice.channelCount)) {
      alert(`通道号超出设备支持的范围（1-${selectedDevice.channelCount}）`);
      return;
    }

    try {
      const response = await axios.post('/api/audio_mapping', {
        device_id: selectedDevice.id,
        operation,
        params
      });
      if (response.data.status === 'success') {
        const historyEntry = {
          time: new Date().toLocaleTimeString(),
          operation,
          params,
          status: '成功'
        };
        setOperationHistory(prevHistory => [historyEntry, ...prevHistory].slice(0, 5));
        alert('音频映射操作成功');
      } else {
        const historyEntry = {
          time: new Date().toLocaleTimeString(),
          operation,
          params,
          status: '失败: ' + response.data.message
        };
        setOperationHistory(prevHistory => [historyEntry, ...prevHistory].slice(0, 5));
        alert('操作失败: ' + response.data.message);
      }
    } catch (error) {
      console.error('执行音频映射操作失败:', error);
      const historyEntry = {
        time: new Date().toLocaleTimeString(),
        operation,
        params,
        status: '失败: ' + error.message
      };
      setOperationHistory(prevHistory => [historyEntry, ...prevHistory].slice(0, 5));
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
              {device.label || device.id} {device.channelCount && `(${device.channelCount}通道)`}
            </li>
          ))}
        </ul>
      </div>
      {selectedDevice && (
        <>
          <div className="device-info">
            <h3>设备信息 - {selectedDevice.label || selectedDevice.id}</h3>
            <p>设备ID: {selectedDevice.id}</p>
            <p>通道数量: {selectedDevice.channelCount || '未知'}</p>
            <div className="channel-map">
              <h4>通道映射图</h4>
              <div className="channel-grid">
                {Array.from({ length: selectedDevice.channelCount || 8 }).map((_, index) => (
                  <div key={index} className="channel-box">
                    Ch {index + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="operation-form">
            <h3>操作配置</h3>
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
                    max={selectedDevice.channelCount || 999}
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
                      max={selectedDevice.channelCount || 999}
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
                      max={selectedDevice.channelCount || 999}
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
                      max={selectedDevice.channelCount || 999}
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
                      max={selectedDevice.channelCount || 999}
                    />
                  </div>
                </>
              )}
              <button type="submit">执行操作</button>
            </form>
          </div>
          <div className="operation-history">
            <h3>操作历史记录</h3>
            {operationHistory.length > 0 ? (
              <ul>
                {operationHistory.map((entry, index) => (
                  <li key={index}>
                    [{entry.time}] {entry.operation} - {JSON.stringify(entry.params)} - {entry.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p>暂无操作记录</p>
            )}
          </div>
        </>
      )}
      <style jsx>{`
        .audio-mapping {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
        }
        .device-list {
          grid-column: 1;
          margin-bottom: 20px;
          border-right: 1px solid #ddd;
          height: calc(100vh - 200px);
          overflow-y: auto;
        }
        .device-list ul {
          list-style: none;
          padding: 0;
        }
        .device-list li {
          cursor: pointer;
          padding: 10px;
          border-bottom: 1px solid #eee;
          transition: background-color 0.2s;
        }
        .device-list li.selected {
          background-color: #e6f7ff;
          font-weight: bold;
        }
        .device-info, .operation-form, .operation-history {
          grid-column: 2;
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
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
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .operation-form button {
          background-color: #1890ff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .operation-form button:hover {
          background-color: #40a9ff;
        }
        .channel-map {
          margin-top: 10px;
        }
        .channel-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5px;
        }
        .channel-box {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          text-align: center;
          padding: 5px;
          border-radius: 3px;
          font-size: 12px;
        }
        .operation-history ul {
          list-style: none;
          padding: 0;
        }
        .operation-history li {
          padding: 5px 0;
          border-bottom: 1px dashed #eee;
          font-size: 14px;
        }
        h3 {
          margin-top: 0;
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        h4 {
          margin-top: 10px;
          font-size: 14px;
        }
        @media (max-width: 900px) {
          .audio-mapping {
            grid-template-columns: 1fr;
          }
          .device-list {
            grid-column: 1;
            border-right: none;
            height: auto;
            max-height: 300px;
          }
          .device-info, .operation-form, .operation-history {
            grid-column: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AudioMapping;