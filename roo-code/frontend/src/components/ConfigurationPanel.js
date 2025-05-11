import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, TextField, Button, Divider, FormControlLabel, Checkbox, MenuItem, Select } from '@mui/material';

const ConfigurationPanel = () => {
  const dispatch = useDispatch();
  const config = useSelector(state => state.config);
  const [localConfig, setLocalConfig] = useState({ ...config });

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setLocalConfig({
      ...localConfig,
      [name]: value,
    });
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setLocalConfig({
      ...localConfig,
      [name]: checked,
    });
  };

  const handleViewChange = (event) => {
    const { name, value } = event.target;
    setLocalConfig({
      ...localConfig,
      customViews: {
        ...localConfig.customViews,
        dashboard: {
          ...localConfig.customViews.dashboard,
          [name]: value,
        }
      }
    });
  };

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CONFIG', payload: localConfig });
    alert('配置已保存');
    console.log('当前配置:', localConfig);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        配置面板
      </Typography>
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        API 设置
      </Typography>
      <TextField
        fullWidth
        margin="normal"
        label="API 端点"
        name="apiEndpoint"
        value={config.apiEndpoint}
        onChange={handleInputChange}
        variant="outlined"
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        轮询设置
      </Typography>
      <TextField
        fullWidth
        margin="normal"
        label="轮询间隔 (毫秒)"
        name="pollingInterval"
        type="number"
        value={config.pollingInterval}
        onChange={handleInputChange}
        variant="outlined"
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        通知设置
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={config.enableNotifications}
            onChange={handleCheckboxChange}
            name="enableNotifications"
          />
        }
        label="启用通知"
      />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        外观设置
      </Typography>
      <TextField
        fullWidth
        margin="normal"
        label="主题"
        name="theme"
        value={localConfig.theme}
        onChange={handleInputChange}
        variant="outlined"
      />

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        自定义视图
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        仪表板布局
      </Typography>
      <Select
        fullWidth
        margin="normal"
        label="布局"
        name="layout"
        value={localConfig.customViews.dashboard.layout}
        onChange={handleViewChange}
        variant="outlined"
      >
        <MenuItem value="default">默认</MenuItem>
        <MenuItem value="compact">紧凑</MenuItem>
        <MenuItem value="detailed">详细</MenuItem>
      </Select>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          保存配置
        </Button>
      </Box>
    </Box>
  );
};

export default ConfigurationPanel;