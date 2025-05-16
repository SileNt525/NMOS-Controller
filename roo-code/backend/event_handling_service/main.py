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
import os # 新增导入
import requests # 新增导入
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException # 新增导入 FastAPI 和 HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EventHandlingService")

# --- FastAPI App Setup ---
app = FastAPI(title="NMOS Event Handling Service (IS-07)")

# --- Configuration from Environment Variables ---
# URL for the Connection Management Service
CONNECTION_SERVICE_URL = os.getenv("CONNECTION_SERVICE_URL")
if not CONNECTION_SERVICE_URL:
    logger.error("环境变量 CONNECTION_SERVICE_URL 未设置。事件触发的路由更改将失败。")
    # CONNECTION_SERVICE_URL = "http://connection_service_not_configured_fallback:8001"

# URL for the NMOS Registry Service (though not directly used in current example, good practice to have)
REGISTRY_SERVICE_URL = os.getenv("REGISTRY_SERVICE_URL")
if not REGISTRY_SERVICE_URL:
    logger.warning("环境变量 REGISTRY_SERVICE_URL 未设置。未来与注册表的集成可能受影响。")


class RulesEngine:
    def __init__(self):
        self.rules: List[Dict[str, Any]] = []
        self.load_rules()
    
    def load_rules(self):
        """从配置文件或数据库加载事件触发规则。"""
        # 配置文件路径可以考虑也从环境变量读取
        rules_file_path = os.getenv("EVENT_RULES_INI_PATH", "event_rules.ini")
        try:
            import configparser
            config = configparser.ConfigParser()
            
            if not os.path.exists(rules_file_path):
                logger.warning(f"规则配置文件 '{rules_file_path}' 未找到。将使用默认规则。")
                self.rules = self._get_default_rules()
                return

            config.read(rules_file_path)
            loaded_rules = []
            for section in config.sections():
                try:
                    rule = {
                        "name": section, # 使用 section 名作为规则名
                        "event_type": config.get(section, 'event_type', fallback=None),
                        "condition": json.loads(config.get(section, 'condition', fallback='{}')),
                        "action": json.loads(config.get(section, 'action', fallback='{}'))
                    }
                    if not rule["event_type"] or not rule["action"]:
                        logger.error(f"规则 '{section}' 缺少 event_type 或 action。跳过此规则。")
                        continue
                    loaded_rules.append(rule)
                except json.JSONDecodeError as e:
                    logger.error(f"解析规则 '{section}' 中的 JSON 失败 (condition 或 action): {e}。跳过此规则。")
                except configparser.NoOptionError as e:
                    logger.error(f"规则 '{section}' 缺少必要字段: {e}。跳过此规则。")

            self.rules = loaded_rules
            if not self.rules:
                logger.info("未从配置文件加载任何有效规则，将使用默认规则。")
                self.rules = self._get_default_rules()
            else:
                logger.info(f"已加载 {len(self.rules)} 条事件触发规则从 '{rules_file_path}'。")

        except Exception as e:
            logger.error(f"加载规则时发生严重错误: {e}", exc_info=True)
            logger.info("发生错误，将使用默认事件触发规则。")
            self.rules = self._get_default_rules()
            
    def _get_default_rules(self) -> List[Dict[str, Any]]:
        logger.info("正在加载默认事件触发规则。")
        return [
            {
                "name": "DefaultTallyRule",
                "event_type": "tally_change", # 这是一个示例类型，实际 IS-07 事件类型是 URN
                "condition": {"state": "on"}, # 示例条件
                "action": {"type": "route_change", "sender_id": "sender_1", "receiver_id": "receiver_1"}
            }
        ]

    def evaluate_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate an event against the rules and return actions to be executed."""
        actions_to_execute = []
        # IS-07 事件通常包含 topic (事件类型 URN) 和 message (事件数据)
        # 例如: event = {"topic": "urn:x-nmos:event:tally", "message": {"state": "on", "source_id": "..."}}
        # 我们假设传入的 event 结构是扁平化的，包含了类型和数据
        
        event_type_from_payload = event.get("type") # 或者从 IS-07 的 topic 提取
        if not event_type_from_payload:
            logger.debug("事件数据中未找到 'type' 字段，无法评估规则。")
            return actions_to_execute

        for rule in self.rules:
            if event_type_from_payload == rule.get("event_type"):
                logger.debug(f"事件类型匹配规则 '{rule.get('name')}': {rule.get('event_type')}")
                condition_met = True
                # 检查条件
                for key, expected_value in rule.get("condition", {}).items():
                    actual_value = event.get(key) # 假设条件字段在事件的顶层
                    # 如果事件数据嵌套，例如 event.get("data", {}).get(key)
                    if actual_value != expected_value:
                        logger.debug(f"规则 '{rule.get('name')}' 条件未满足: 字段 '{key}' 的值 '{actual_value}' 不等于期望值 '{expected_value}'")
                        condition_met = False
                        break
                
                if condition_met:
                    logger.info(f"事件满足规则 '{rule.get('name')}' 的所有条件。准备执行动作: {rule.get('action')}")
                    actions_to_execute.append(rule["action"])
        
        return actions_to_execute

class EventHandlingService:
    def __init__(self):
        self.subscriptions: Dict[str, websockets.WebSocketClientProtocol] = {} # 存储 device_id -> websocket 连接
        self.rules_engine = RulesEngine() # 初始化规则引擎
        self._active_subscription_tasks: Dict[str, asyncio.Task] = {} # 存储 device_id -> task
        
    async def subscribe_to_event_source(self, device_id: str, event_source_url: str):
        """Subscribe to an IS-07 event source (WebSocket) on a device."""
        if device_id in self._active_subscription_tasks and not self._active_subscription_tasks[device_id].done():
            logger.info(f"已存在对设备 {device_id} ({event_source_url}) 的有效订阅。")
            return

        logger.info(f"尝试订阅设备 {device_id} 的事件源: {event_source_url}")
        try:
            # IS-07 WebSocket 连接通常需要发送一个订阅命令
            # {"command": "subscribe", "params": {"source_id": "desired_event_source_uuid"}}
            # 此处的 event_source_url 应该是 WebSocket 端点
            # 而实际订阅哪个 source_id 需要额外信息，这里简化处理，假设连接即订阅所有
            
            async with websockets.connect(event_source_url, ping_interval=20, ping_timeout=20) as websocket:
                self.subscriptions[device_id] = websocket
                logger.info(f"成功订阅到设备 {device_id} 的事件源: {event_source_url}")
                
                # IS-07 v1.0 spec, section 4.1.1:
                # "Once a connection is established the client MAY send a `subscription` message..."
                # Let's assume for now we don't need to send an explicit subscription message,
                # or that the event_source_url itself implies the subscription target.
                # For a specific source, a message like:
                # sub_request = {"command": "subscribe", "params": {"source_id": "..."}} # source_id needs to be known
                # await websocket.send(json.dumps(sub_request))

                while True:
                    try:
                        event_data_raw = await websocket.recv()
                        if isinstance(event_data_raw, str):
                            await self.process_event(device_id, event_data_raw)
                        else:
                            logger.warning(f"从设备 {device_id} 收到非字符串类型消息: {type(event_data_raw)}")
                    except websockets.exceptions.ConnectionClosed as e:
                        logger.info(f"与设备 {device_id} ({event_source_url}) 的 WebSocket 连接已关闭: {e}")
                        break 
                    except Exception as e:
                        logger.error(f"处理来自设备 {device_id} 的消息时发生错误: {e}", exc_info=True)
                        # 根据错误类型决定是否继续循环或断开
                        if not websocket.closed: # 如果连接仍然打开，但发生错误，则继续尝试接收
                            await asyncio.sleep(1) 
                        else:
                            break
        except websockets.exceptions.InvalidURI:
            logger.error(f"订阅设备 {device_id} 失败: 无效的 WebSocket URI '{event_source_url}'")
        except websockets.exceptions.WebSocketException as e:
            logger.error(f"订阅设备 {device_id} ({event_source_url}) 时发生 WebSocket 错误: {e}")
        except ConnectionRefusedError:
            logger.error(f"订阅设备 {device_id} ({event_source_url}) 失败: 连接被拒绝。")
        except Exception as e:
            logger.error(f"订阅设备 {device_id} ({event_source_url}) 时发生未知错误: {e}", exc_info=True)
        finally:
            if device_id in self.subscriptions:
                del self.subscriptions[device_id]
            if device_id in self._active_subscription_tasks:
                del self._active_subscription_tasks[device_id] # 移除任务记录
            logger.info(f"设备 {device_id} ({event_source_url}) 的订阅任务结束。")
            # 简单的自动重连逻辑: 如果任务不是被显式取消的，则尝试重连
            # 需要检查任务是否被取消，以及连接是否是意外关闭
            current_task = asyncio.current_task()
            if not (current_task and current_task.cancelled()):
                # 假设非正常关闭 (例如网络错误) 会导致此路径
                # 避免在显式取消订阅时重连
                # 实际应用中可能需要更精细的判断条件
                logger.warning(f"设备 {device_id} ({event_source_url}) 的 WebSocket 连接意外断开，将在10秒后尝试重连...")
                # 创建一个新的 task 来进行延时重连
                async def delayed_reconnect():
                    await asyncio.sleep(10) # 延时10秒
                    logger.info(f"尝试为设备 {device_id} ({event_source_url}) 重新订阅...")
                    # 重新创建订阅任务，并更新到 _active_subscription_tasks
                    # 注意：这里需要确保不会无限递归或创建过多任务
                    # 更好的做法可能是有一个专门的管理器来处理重试
                    if device_id not in self._active_subscription_tasks or self._active_subscription_tasks[device_id].done():
                        reconnect_task = asyncio.create_task(self.subscribe_to_event_source(device_id, event_source_url))
                        self._active_subscription_tasks[device_id] = reconnect_task
                    else:
                        logger.info(f"设备 {device_id} 已存在活动的重连/订阅任务，跳过此次重连尝试。")
                
                # 确保不会因为API请求的取消而意外触发重连
                # 只有当此订阅任务本身结束且非取消时才重连
                # 检查 self._active_subscription_tasks[device_id] 是否还指向当前结束的任务
                # 这个逻辑比较复杂，暂时简化为只要不是取消就尝试创建重连任务
                asyncio.create_task(delayed_reconnect())
    
    async def process_event(self, device_id: str, event_data_str: str):
        """Process an incoming IS-07 event."""
        logger.debug(f"收到来自设备 {device_id} 的原始事件数据: {event_data_str[:200]}")
        try:
            # IS-07 事件消息格式: {"topic": "...", "type": "state" (or "measurement"), "data": [{...event_payload...}]}
            # 或者更简单的 {"type": "tally_change", "state": "on", ...} (如开发计划中示例)
            # 我们假设 event_data_str 是一个包含事件详情的 JSON 对象字符串
            event_payload = json.loads(event_data_str)
            
            # 检查是否是 IS-07 标准的 grain 格式
            if "grain" in event_payload and isinstance(event_payload["grain"], dict):
                grain = event_payload["grain"]
                topic = grain.get("topic") # URN for the event type
                # data is an array of event objects
                event_list = grain.get("data", [])
                for single_event_data in event_list:
                    # single_event_data should contain the actual event fields
                    # We might need to augment it with the topic if rules depend on it
                    if topic and "type" not in single_event_data : # Add type from topic if not present
                         # Extract a simpler type from URN if possible for rules engine
                        simple_type = topic.split(':')[-1] if ':' in topic else topic
                        single_event_data["type"] = simple_type # or use full topic URN
                        single_event_data["topic_urn"] = topic


                    logger.info(f"处理来自设备 {device_id} 的事件: {single_event_data}")
                    actions = self.rules_engine.evaluate_event(single_event_data)
                    for action in actions:
                        await self.execute_action(action, source_device_id=device_id, source_event=single_event_data)
            else: # 处理非 grain 格式的简单 JSON 事件
                logger.info(f"处理来自设备 {device_id} 的扁平化事件: {event_payload}")
                actions = self.rules_engine.evaluate_event(event_payload)
                for action in actions:
                    await self.execute_action(action, source_device_id=device_id, source_event=event_payload)

        except json.JSONDecodeError as e:
            logger.error(f"解析来自设备 {device_id} 的事件数据失败: '{event_data_str[:200]}'. Error: {e}")
        except Exception as e:
            logger.error(f"处理来自设备 {device_id} 的事件时发生错误: {e}", exc_info=True)
    
    async def execute_action(self, action: Dict[str, Any], source_device_id: str = None, source_event: Dict[str, Any] = None):
        """Execute an action triggered by an event."""
        action_type = action.get("type")
        logger.info(f"准备执行动作: {action_type}, 参数: {action}, 原始事件来自: {source_device_id}")

        if action_type == "route_change":
            sender_id = action.get("sender_id")
            receiver_id = action.get("receiver_id")
            # transport_params 和 activation_mode 可以从 action 中获取，或使用默认值
            transport_params = action.get("transport_params", [{}]) # IS-05 expects an array
            activation_mode = action.get("activation_mode", "activate_immediate")
            activation_time = action.get("activation_time")

            if sender_id and receiver_id:
                await self.perform_route_change(sender_id, receiver_id, transport_params, activation_mode, activation_time)
            else:
                logger.error(f"路由更改动作缺少 sender_id 或 receiver_id: {action}")
        
        elif action_type == "log_event":
            log_message = action.get("message", "No message specified in action.")
            logger.info(f"动作类型 'log_event': {log_message}. 原始事件: {source_event}")
            
        # 可以添加其他动作类型
        else:
            logger.warning(f"未知的动作类型: {action_type}")
    
    async def perform_route_change(self, sender_id: str, receiver_id: str, transport_params: List[Dict], activation_mode: str, activation_time: str = None):
        """通过连接管理服务执行路由更改。"""
        if not CONNECTION_SERVICE_URL:
            logger.error("连接管理服务 URL 未配置，无法执行路由更改。")
            return

        connection_payload = {
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'transport_params': transport_params,
            'activation_mode': activation_mode
        }
        if activation_time and activation_mode in ["activate_scheduled_absolute", "activate_scheduled_relative"]:
            connection_payload['activation_time'] = activation_time
            
        connect_url = f"{CONNECTION_SERVICE_URL.rstrip('/')}/connect"
        logger.info(f"向连接管理服务 ({connect_url}) 发起路由更改: Sender {sender_id} 到 Receiver {receiver_id}")
        
        try:
            # 使用 requests 进行同步调用。如果需要异步，应使用 httpx。
            # 但由于 FastAPI 路由函数可以是异步的，requests 在这里可以工作（它会在一个线程中运行）。
            response = requests.post(connect_url, json=connection_payload, timeout=10)
            response.raise_for_status() # 检查 HTTP 错误
            
            logger.info(f"路由更改请求成功发送到连接管理服务。响应: {response.json()}")
        except requests.exceptions.HTTPError as e:
            logger.error(f"路由更改请求到连接管理服务失败: {e.response.status_code} - {e.response.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"执行路由更改时发生网络错误 (连接到 {connect_url}): {e}")
        except Exception as e:
            logger.error(f"执行路由更改时发生未知错误: {e}", exc_info=True)
            
    async def unsubscribe_from_device(self, device_id: str):
        """Unsubscribe from an event source on a device."""
        if device_id in self._active_subscription_tasks:
            task = self._active_subscription_tasks[device_id]
            if not task.done():
                task.cancel()
                try:
                    await task # 等待任务实际取消
                except asyncio.CancelledError:
                    logger.info(f"设备 {device_id} 的订阅任务已取消。")
            del self._active_subscription_tasks[device_id]

        if device_id in self.subscriptions:
            websocket = self.subscriptions[device_id]
            if not websocket.closed:
                await websocket.close()
            del self.subscriptions[device_id]
            logger.info(f"已取消订阅设备 {device_id} 的事件源。")

# --- FastAPI Endpoints (示例，可以根据需要扩展) ---
event_service_instance = EventHandlingService()

@app.post("/subscribe", summary="Subscribe to an NMOS Device's Event Source (WebSocket)")
async def subscribe_to_device_events(device_id: str, event_source_url: str):
    if not event_source_url or not device_id:
        raise HTTPException(status_code=400, detail="device_id 和 event_source_url 都是必需的。")
    
    if device_id in event_service_instance._active_subscription_tasks and \
       not event_service_instance._active_subscription_tasks[device_id].done():
        return {"message": f"已存在对设备 {device_id} 的有效订阅。"}

    # 异步运行订阅任务，使其不阻塞 API 响应
    task = asyncio.create_task(event_service_instance.subscribe_to_event_source(device_id, event_source_url))
    event_service_instance._active_subscription_tasks[device_id] = task
    
    return {"message": f"已启动对设备 {device_id} ({event_source_url}) 事件源的订阅。"}

@app.post("/unsubscribe", summary="Unsubscribe from an NMOS Device's Event Source")
async def unsubscribe_from_device_events(device_id: str):
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id 是必需的。")
    
    if device_id not in event_service_instance._active_subscription_tasks and device_id not in event_service_instance.subscriptions:
         raise HTTPException(status_code=404, detail=f"未找到设备 {device_id} 的活动订阅。")

    await event_service_instance.unsubscribe_from_device(device_id)
    return {"message": f"已取消对设备 {device_id} 事件源的订阅。"}

@app.get("/subscriptions", summary="List active subscriptions")
async def list_subscriptions():
    active_subs = []
    for device_id, ws in event_service_instance.subscriptions.items():
        active_subs.append({
            "device_id": device_id,
            "url": ws.remote_address[0] if ws.remote_address else "N/A", # ws.remote_address 可能不存在或格式不同
            "is_open": not ws.closed
        })
    return {"subscriptions": active_subs, "active_tasks_count": len(event_service_instance._active_subscription_tasks)}

@app.get("/rules", summary="List current event processing rules")
async def get_rules():
    return {"rules": event_service_instance.rules_engine.rules}

# 健康检查端点
@app.get("/health", summary="Health check endpoint")
async def health_check():
    conn_service_status = "unknown"
    if not CONNECTION_SERVICE_URL:
        conn_service_status = "unconfigured"
    else:
        try:
            conn_health_url = f"{CONNECTION_SERVICE_URL.rstrip('/')}/health"
            response = requests.get(conn_health_url, timeout=2)
            if response.status_code == 200:
                conn_service_status = "ok"
            else:
                conn_service_status = f"error_status_{response.status_code}"
        except requests.exceptions.RequestException:
            conn_service_status = "unreachable"
            
    return {
        "status": "ok",
        "active_subscriptions_count": len(event_service_instance.subscriptions),
        "dependencies": {
            "connection_service": {
                "url": CONNECTION_SERVICE_URL,
                "status": conn_service_status
            },
            "registry_service": { # 示例，如果将来需要
                 "url": REGISTRY_SERVICE_URL,
                 "status": "not_checked" # 或实现检查
            }
        }
    }

# 移除旧的 main() 函数和 if __name__ == "__main__": asyncio.run(main())
# 因为现在这是一个 FastAPI 应用，将由 uvicorn 启动

async def main_simulation(): # 仅用于本地测试或后台任务，如果需要的话
    # 这是一个模拟订阅的示例，实际订阅应通过 API 或其他配置触发
    logger.info("事件处理服务模拟启动...")
    # 以下是旧的 main() 中的模拟代码，如果需要独立运行测试，可以放在这里
    # test_device_id = "device_1"
    # test_event_source_url = "ws://localhost:12345/events" # 需要一个实际的测试 WebSocket 服务器
    # logger.info(f"模拟订阅到: {test_event_source_url}")
    # await event_service_instance.subscribe_to_event_source(test_device_id, test_event_source_url)
    # 为了保持服务运行以处理API调用，不需要在这里做任何事情
    # 除非你想启动一些默认的后台任务
    
    # 例如，可以启动一个任务来定期从注册服务发现IS-07源并自动订阅
    # discover_and_subscribe_task = asyncio.create_task(discover_is07_sources_and_subscribe())
    # await discover_and_subscribe_task


@app.on_event("startup")
async def on_startup():
    logger.info("事件处理服务启动完成。")
    # 可以启动一些后台任务，例如定期检查订阅状态或重新连接失败的订阅
    # asyncio.create_task(main_simulation()) # 如果需要模拟订阅


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("事件处理服务正在关闭...")
    # 清理所有活动的 WebSocket 订阅
    active_device_ids = list(event_service_instance.subscriptions.keys())
    for device_id in active_device_ids:
        logger.info(f"关闭时取消订阅设备 {device_id}...")
        await event_service_instance.unsubscribe_from_device(device_id)
    logger.info("所有活动订阅已清理。")

if __name__ == "__main__":
    import uvicorn
    # 从环境变量获取端口，默认为 8002
    api_port = int(os.getenv("API_PORT", "8002"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    logger.info(f"启动事件处理服务在端口 {api_port}，日志级别: {log_level}")
    logger.info(f"连接管理服务 URL: {CONNECTION_SERVICE_URL}")
    logger.info(f"注册服务 URL (参考): {REGISTRY_SERVICE_URL}")
    
    uvicorn.run(app, host="0.0.0.0", port=api_port, log_level=log_level)

