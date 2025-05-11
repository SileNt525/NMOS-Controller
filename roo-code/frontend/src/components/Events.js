import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchEvents, updateRule } from '../reducers/eventsReducer';

const Events = () => {
  const dispatch = useDispatch();
  const events = useSelector(state => state.events.events);
  const rules = useSelector(state => state.events.rules);
  const [newRule, setNewRule] = useState({ eventType: '', condition: '', action: '' });

  useEffect(() => {
    // Fetch events on component mount
    dispatch(fetchEvents());
    // Set up WebSocket connection for real-time event updates
    // TODO: Implement WebSocket connection to Notification Service
  }, [dispatch]);

  const handleRuleChange = (e) => {
    const { name, value } = e.target;
    setNewRule(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRule = () => {
    if (newRule.eventType && newRule.condition && newRule.action) {
      dispatch(updateRule(newRule));
      setNewRule({ eventType: '', condition: '', action: '' });
    }
  };

  return (
    <div className="events-container">
      <h2>事件日志与Tally信息</h2>
      <div className="events-log">
        <h3>事件日志</h3>
        <ul>
          {events.map((event, index) => (
            <li key={index}>
              {event.timestamp} - {event.deviceId} - {event.type}: {event.details}
            </li>
          ))}
        </ul>
      </div>
      <div className="tally-info">
        <h3>Tally信息</h3>
        {events.filter(event => event.type === 'tally_change').map((event, index) => (
          <p key={index}>
            设备ID: {event.deviceId}, 状态: {event.state === 'on' ? '开启' : '关闭'}
          </p>
        ))}
        {events.filter(event => event.type === 'tally_change').length === 0 && <p>暂无Tally信息</p>}
      </div>
      <div className="event-rules">
        <h3>事件触发规则配置</h3>
        <div className="rule-form">
          <input
            type="text"
            name="eventType"
            value={newRule.eventType}
            onChange={handleRuleChange}
            placeholder="事件类型"
          />
          <input
            type="text"
            name="condition"
            value={newRule.condition}
            onChange={handleRuleChange}
            placeholder="条件"
          />
          <input
            type="text"
            name="action"
            value={newRule.action}
            onChange={handleRuleChange}
            placeholder="动作"
          />
          <button onClick={handleAddRule}>添加规则</button>
        </div>
        <ul>
          {rules.map((rule, index) => (
            <li key={index}>
              事件类型: {rule.eventType}, 条件: {rule.condition}, 动作: {rule.action}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Events;