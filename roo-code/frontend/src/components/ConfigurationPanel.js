import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Divider, FormControlLabel, Checkbox } from '@mui/material';

const ConfigurationPanel = () => {
  const [config, setConfig] = useState({
    apiEndpoint: 'https://api.example.com',
    pollingInterval: 5000,
    enableNotifications: true,
    theme: 'light',
  });

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setConfig({
      ...config,
      [name]: value,
    });
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setConfig({
      ...config,
      [name]: checked,
    });
  };

  const handleSave = () => {
    // 这里应调用API保存配置，暂时仅作演示
    alert('配置已保存');
    console.log('当前配置:', config);
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
        value={config.theme}
        onChange={handleInputChange}
        variant="outlined"
      />
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleSave}>
          保存配置
        </Button>
      </Box>
    </Box>
  );
};

export default ConfigurationPanel;