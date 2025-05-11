"""
Roo Code - IS-07 Event Handling Service

This service manages subscriptions to IS-07 event sources on NMOS devices,
processes incoming events, and triggers actions such as routing changes
through a rules engine. It integrates with the Connection Management Service
to implement event-triggered routing.
"""

import asyncio
import websockets
import json
import logging
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EventHandlingService")

class EventHandlingService:
    def __init__(self):
        self.subscriptions: Dict[str, Any] = {}
        self.rules_engine = RulesEngine()
        
    async def subscribe_to_event_source(self, device_id: str, event_source_url: str):
        """Subscribe to an IS-07 event source on a device."""
        try:
            async with websockets.connect(event_source_url) as websocket:
                logger.info(f"Subscribed to event source for device {device_id} at {event_source_url}")
                self.subscriptions[device_id] = websocket
                while True:
                    event_data = await websocket.recv()
                    await self.process_event(device_id, event_data)
        except Exception as e:
            logger.error(f"Error subscribing to event source for device {device_id}: {e}")
            if device_id in self.subscriptions:
                del self.subscriptions[device_id]
    
    async def process_event(self, device_id: str, event_data: str):
        """Process an incoming IS-07 event."""
        try:
            event = json.loads(event_data)
            logger.info(f"Received event from device {device_id}: {event}")
            actions = self.rules_engine.evaluate_event(event)
            for action in actions:
                await self.execute_action(action)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode event data from device {device_id}: {e}")
        except Exception as e:
            logger.error(f"Error processing event from device {device_id}: {e}")
    
    async def execute_action(self, action: Dict[str, Any]):
        """Execute an action triggered by an event."""
        logger.info(f"Executing action: {action}")
        if action["type"] == "route_change":
            await self.perform_route_change(action["sender_id"], action["receiver_id"])
    
    async def perform_route_change(self, sender_id: str, receiver_id: str):
        """通过连接管理服务执行路由更改。"""
        try:
            logger.info(f"执行路由更改: {sender_id} 到 {receiver_id}")
            import requests
            # 使用连接管理服务的API进行路由更改
            response = requests.post('http://localhost:8001/connect',
                                    json={
                                        'sender_id': sender_id,
                                        'receiver_id': receiver_id,
                                        'transport_params': {},
                                        'activation_mode': 'activate_immediate'
                                    })
            if response.status_code == 200:
                logger.info(f"路由更改成功: {sender_id} 到 {receiver_id}")
            else:
                logger.error(f"路由更改失败: {response.status_code}")
        except Exception as e:
            logger.error(f"执行路由更改时出错: {e}")
    
    async def unsubscribe_from_device(self, device_id: str):
        """Unsubscribe from an event source on a device."""
        if device_id in self.subscriptions:
            websocket = self.subscriptions[device_id]
            await websocket.close()
            del self.subscriptions[device_id]
            logger.info(f"Unsubscribed from event source for device {device_id}")

class RulesEngine:
    def __init__(self):
        self.rules: List[Dict[str, Any]] = []
        self.load_rules()
    
    def load_rules(self):
        """从配置文件或数据库加载事件触发规则。"""
        try:
            # 尝试从配置文件加载规则
            import configparser
            config = configparser.ConfigParser()
            config.read('event_rules.ini')
            self.rules = []
            for section in config.sections():
                rule = {
                    "event_type": config[section].get('event_type'),
                    "condition": json.loads(config[section].get('condition', '{}')),
                    "action": json.loads(config[section].get('action', '{}'))
                }
                self.rules.append(rule)
            if not self.rules:
                # 如果配置文件中没有规则，使用默认规则
                self.rules = [
                    {
                        "event_type": "tally_change",
                        "condition": {"state": "on"},
                        "action": {"type": "route_change", "sender_id": "sender_1", "receiver_id": "receiver_1"}
                    }
                ]
            logger.info(f"已加载 {len(self.rules)} 条事件触发规则")
        except Exception as e:
            logger.error(f"加载规则时出错: {e}")
            # 出错时使用默认规则
            self.rules = [
                {
                    "event_type": "tally_change",
                    "condition": {"state": "on"},
                    "action": {"type": "route_change", "sender_id": "sender_1", "receiver_id": "receiver_1"}
                }
            ]
            logger.info("已加载默认事件触发规则")
    
    def evaluate_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate an event against the rules and return actions to be executed."""
        actions = []
        for rule in self.rules:
            if event.get("type") == rule["event_type"]:
                condition_met = True
                for key, value in rule["condition"].items():
                    if event.get(key) != value:
                        condition_met = False
                        break
                if condition_met:
                    actions.append(rule["action"])
        return actions

async def main():
    service = EventHandlingService()
    # TODO: Implement discovery of devices and event sources through NMOS Registry Service
    # For now, simulate subscription to a device event source
    test_device_id = "device_1"
    test_event_source_url = "ws://example.com/device_1/events"
    await service.subscribe_to_event_source(test_device_id, test_event_source_url)

if __name__ == "__main__":
    asyncio.run(main())