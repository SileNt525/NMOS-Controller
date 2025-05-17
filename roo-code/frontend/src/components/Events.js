import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchEventRules, addRule as addRuleAction } from '../reducers/eventsReducer'; // Renamed addRule to addRuleAction
import {
  Box, Typography, TextField, Button, List, ListItem, ListItemText, Paper, Grid, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';

const Events = () => {
  const dispatch = useDispatch();
  const events = useSelector(state => state.events.events);
  const rules = useSelector(state => state.events.rules);
  const isLoading = useSelector(state => state.events.loading);
  const error = useSelector(state => state.events.error);

  const initialRuleState = {
    ruleId: `rule_${Date.now()}`,
    event_type: '', // e.g., tally_change, gpi_trigger
    condition_field: '', // e.g., state, gpi_id, type (if event payload has 'type')
    condition_value: '', // e.g., on, emergency_button, pressed
    action_type: 'route_change', // 'route_change' or 'log_event'
    action_sender_id: '',
    action_receiver_id: '',
    action_message: '', // For log_event
    // Add other action params like transport_params, activation_mode if needed
  };
  const [newRule, setNewRule] = useState(initialRuleState);

  useEffect(() => {
    dispatch(fetchEventRules());
    // WebSocket connection for live events is handled in App.js
    // Events component will re-render when `state.events.events` is updated by WebSocket messages
  }, [dispatch]);

  const handleRuleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRule = () => {
    // Basic validation
    if (!newRule.event_type || !newRule.condition_field || !newRule.condition_value || !newRule.action_type) {
      alert('请填写所有必要的规则字段。');
      return;
    }
    if (newRule.action_type === 'route_change' && (!newRule.action_sender_id || !newRule.action_receiver_id)) {
      alert('路由变更操作需要发送方ID和接收方ID。');
      return;
    }
    if (newRule.action_type === 'log_event' && !newRule.action_message) {
      alert('日志事件操作需要消息内容。');
      return;
    }

    // Construct the rule object in the format expected by the backend (similar to event_rules.ini structure)
    // This might need adjustment based on how backend's /rules POST endpoint (if any) expects data.
    // For now, we'll create a structure that can be easily stringified or processed.
    const ruleToSubmit = {
      name: newRule.ruleId, // Or generate a more meaningful name/ID
      event_type: newRule.event_type,
      condition: { [newRule.condition_field]: newRule.condition_value },
      action: {
        type: newRule.action_type,
        ...(newRule.action_type === 'route_change' && {
          sender_id: newRule.action_sender_id,
          receiver_id: newRule.action_receiver_id,
          // transport_params: [{}], // Default or allow configuration
          // activation_mode: "activate_immediate", // Default or allow configuration
        }),
        ...(newRule.action_type === 'log_event' && {
          message: newRule.action_message,
        }),
      }
    };

    dispatch(addRuleAction(ruleToSubmit)); // Dispatch the action from eventsReducer
    setNewRule(initialRuleState); // Reset form
  };

  if (isLoading) return <Typography>加载规则中...</Typography>;
  if (error) return <Typography color="error">加载规则失败: {error}</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>事件与规则管理</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">事件日志 (最新 {events.length} 条)</Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {events.length === 0 && <ListItem><ListItemText primary="暂无实时事件" /></ListItem>}
              {events.map((event, index) => (
                <ListItem key={index}>
                  <ListItemText 
                    primary={`${event.type} - ${event.deviceId || 'N/A'}`}
                    secondary={`${new Date(event.timestamp || Date.now()).toLocaleString()}: ${JSON.stringify(event.details || event.payload || event)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Tally 信息</Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {events.filter(e => e.type === 'tally_change' || (e.payload && e.payload.type === 'tally_change')).length === 0 && 
                <ListItem><ListItemText primary="暂无Tally信息" /></ListItem>}
              {events.filter(e => e.type === 'tally_change' || (e.payload && e.payload.type === 'tally_change')).map((event, index) => {
                const tallyData = event.payload || event; // Assuming payload contains the actual tally data
                return (
                  <ListItem key={index}>
                    <ListItemText primary={`设备: ${tallyData.deviceId || '未知'}, 状态: ${tallyData.state === 'on' ? '开启' : '关闭'}`} />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>事件触发规则配置</Typography>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="规则ID (自动生成)" name="ruleId" value={newRule.ruleId} onChange={handleRuleInputChange} disabled size="small" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="事件类型 (event_type)" name="event_type" value={newRule.event_type} onChange={handleRuleInputChange} placeholder="e.g., tally_change" size="small" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="条件字段 (condition_field)" name="condition_field" value={newRule.condition_field} onChange={handleRuleInputChange} placeholder="e.g., state" size="small" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth label="条件值 (condition_value)" name="condition_value" value={newRule.condition_value} onChange={handleRuleInputChange} placeholder="e.g., on" size="small" />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>动作类型</InputLabel>
                  <Select name="action_type" value={newRule.action_type} label="动作类型" onChange={handleRuleInputChange}>
                    <MenuItem value="route_change">路由变更</MenuItem>
                    <MenuItem value="log_event">记录事件</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {newRule.action_type === 'route_change' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="发送方ID (action_sender_id)" name="action_sender_id" value={newRule.action_sender_id} onChange={handleRuleInputChange} size="small" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth label="接收方ID (action_receiver_id)" name="action_receiver_id" value={newRule.action_receiver_id} onChange={handleRuleInputChange} size="small" />
                  </Grid>
                </>
              )}
              {newRule.action_type === 'log_event' && (
                <Grid item xs={12} sm={6} md={6}>
                  <TextField fullWidth label="日志消息 (action_message)" name="action_message" value={newRule.action_message} onChange={handleRuleInputChange} size="small" />
                </Grid>
              )}
              <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Button fullWidth variant="contained" onClick={handleAddRule} sx={{ height: '40px' }}>添加规则</Button>
              </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>当前规则:</Typography>
            <List dense>
              {rules.length === 0 && <ListItem><ListItemText primary="暂无已配置规则" /></ListItem>}
              {rules.map((rule, index) => (
                <ListItem key={index} divider>
                  <ListItemText 
                    primary={`规则名: ${rule.name || rule.ruleId}`}
                    secondary={`类型: ${rule.event_type}, 条件: ${JSON.stringify(rule.condition)}, 动作: ${JSON.stringify(rule.action)}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Events;