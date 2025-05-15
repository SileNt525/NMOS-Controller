from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import websocket
import json
import threading
import asyncio # 确保导入 asyncio
import logging
import os
from typing import Dict, List, Any, Optional # 新增 Optional

app = FastAPI(title="NMOS Registry Service (IS-04)")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 内部缓存，用于存储NMOS资源
# 修改为字典存储，键为资源ID，值为资源对象
nmos_resources: Dict[str, Dict[str, Any]] = {
    "nodes": {},
    "devices": {},
    "senders": {},
    "receivers": {},
    "sources": {},
    "flows": {}
}
# 用于跟踪所有已知的资源ID及其类型，方便清理
# "resource_id": "nodes" (plural type)
known_resource_ids: Dict[str, str] = {}


# registry_url 将在 startup_event 中从环境变量初始化，或通过 /configure API 设置
registry_url: Optional[str] = None
ws_connection: Optional[websocket.WebSocketApp] = None # 用于持有 WebSocketApp 实例，方便管理
ws_thread: Optional[threading.Thread] = None # 用于跟踪 WebSocket 线程

class RegistryConfig(BaseModel):
    registry_url: str

def start_websocket_subscription():
    global registry_url, ws_connection, ws_thread
    if ws_thread and ws_thread.is_alive():
        logger.info("WebSocket 线程已在运行。如果需要更改 URL，请先停止现有连接。")
        if ws_connection:
             logger.info("正在关闭现有 WebSocket 连接...")
             ws_connection.close() # 请求关闭
             ws_thread.join(timeout=5) # 等待线程结束
             logger.info("现有 WebSocket 连接已关闭。")
        ws_connection = None
        ws_thread = None


    if registry_url:
        try:
            if not isinstance(registry_url, str) or not (registry_url.startswith("http://") or registry_url.startswith("https://")):
                logger.error(f"无效的 NMOS 注册中心 URL 格式: {registry_url}. 应包含 http:// 或 https://")
                return

            query_api_base = registry_url
            if query_api_base.endswith('/'):
                query_api_base = query_api_base[:-1]
            
            # IS-04 Query API /subscriptions endpoint
            ws_path_segment = "/subscriptions" 
            
            if query_api_base.startswith("https://"):
                ws_scheme = "wss://"
                base_for_ws_url = query_api_base[len("https://"):]
            elif query_api_base.startswith("http://"):
                ws_scheme = "ws://"
                base_for_ws_url = query_api_base[len("http://"):]
            else:
                logger.error(f"registry_url ('{registry_url}') 必须以 http:// 或 https:// 开头。")
                return

            ws_url = f"{ws_scheme}{base_for_ws_url}{ws_path_segment}"

            logger.info(f"尝试连接到 WebSocket: {ws_url}")
            ws_connection = websocket.WebSocketApp(ws_url,
                                        on_open=on_open,
                                        on_message=on_message,
                                        on_error=on_error,
                                        on_close=on_close)
            ws_thread = threading.Thread(target=ws_connection.run_forever, daemon=True)
            ws_thread.start()
            logger.info(f"WebSocket订阅线程已启动，连接到 {ws_url}")

        except Exception as e:
            logger.error(f"启动 WebSocket 订阅时发生错误: {e}", exc_info=True)
    else:
        logger.warning("未配置 NMOS 注册中心 URL，WebSocket 订阅未启动。")


@app.post("/configure")
async def configure_registry(config: RegistryConfig):
    """配置NMOS注册中心URL"""
    global registry_url
    old_url = registry_url
    registry_url = config.registry_url
    logger.info(f"NMOS注册中心已配置为: {registry_url}")
    if old_url != registry_url or (ws_thread is None or not ws_thread.is_alive()):
        logger.info("检测到 registry_url 更改或 WebSocket 未运行，正在尝试（重新）启动 WebSocket。")
        start_websocket_subscription() # 调用封装的函数
    return {"message": "注册中心配置成功", "url": registry_url}


def process_resource_update(resource_data: Dict):
    """
    处理单个资源的创建、更新。
    resource_data 是单个 NMOS 资源对象。
    """
    global nmos_resources, known_resource_ids
    
    if not isinstance(resource_data, dict) or "id" not in resource_data or "type" not in resource_data:
        logger.warning(f"收到的资源格式不正确或缺少id/type: {str(resource_data)[:200]}")
        return False

    resource_id = resource_data["id"]
    resource_type_singular = resource_data["type"] # e.g., "node", "device"
    resource_type_plural = resource_type_singular + "s"

    if resource_type_plural not in nmos_resources:
        logger.warning(f"未知的资源类型复数形式: '{resource_type_plural}' (来自单数 '{resource_type_singular}')")
        return False

    if resource_id in nmos_resources[resource_type_plural]:
        # 比较版本以确定是否是真正的更新 (IS-04 资源有 version 字段: "seconds:nanoseconds")
        # existing_version = nmos_resources[resource_type_plural][resource_id].get("version")
        # new_version = resource_data.get("version")
        # if existing_version == new_version:
        #     logger.debug(f"资源 {resource_type_plural}/{resource_id} 版本未变 ({new_version})，跳过更新。")
        #     return False # 返回 False 表示没有实际更新发生
        # else:
        #     logger.info(f"更新资源 {resource_type_plural}/{resource_id} 从版本 {existing_version} 到 {new_version}")
        logger.info(f"更新资源 {resource_type_plural}/{resource_id}")
    else:
        logger.info(f"新增资源 {resource_type_plural}/{resource_id}")
    
    nmos_resources[resource_type_plural][resource_id] = resource_data
    known_resource_ids[resource_id] = resource_type_plural
    return True # 表示资源被添加或更新

def process_resource_deletion(resource_id: str):
    """处理单个资源的删除。"""
    global nmos_resources, known_resource_ids
    
    if resource_id in known_resource_ids:
        resource_type_plural = known_resource_ids[resource_id]
        if resource_id in nmos_resources.get(resource_type_plural, {}):
            del nmos_resources[resource_type_plural][resource_id]
            del known_resource_ids[resource_id]
            logger.info(f"已删除资源 {resource_type_plural}/{resource_id} 从缓存。")
            return True
        else: # Should not happen if known_resource_ids is consistent
            logger.warning(f"尝试删除资源 {resource_id} (类型 {resource_type_plural}), 但在 nmos_resources 中未找到。可能已被删除。")
            del known_resource_ids[resource_id] # Clean up known_resource_ids
            return False
    else:
        logger.debug(f"尝试删除资源 {resource_id}, 但在 known_resource_ids 中未找到。可能已被删除或从未被添加。")
        return False


def on_message(ws, message_str: str):
    """处理WebSocket消息"""
    try:
        message_obj = json.loads(message_str)
        if not isinstance(message_obj, dict) or "grain" not in message_obj:
            logger.warning(f"收到的WebSocket消息不是预期的 grain 格式: {message_str[:200]}")
            return

        grain = message_obj["grain"]
        if not isinstance(grain, dict) or "data" not in grain or not isinstance(grain["data"], list):
            logger.warning(f"grain 格式不正确或 grain.data 不是列表: {str(grain)[:200]}")
            return
        
        # grain.topic 通常是 / (表示所有资源) 或特定资源的路径 /<type>/<id>
        # grain.origin_timestamp, grain.sync_timestamp, grain.creation_timestamp (ISO 8601)
        # grain.source_id (UUID of the Registration API instance)
        
        updates_processed_count = 0
        for change_wrapper in grain["data"]:
            # IS-04 Part A Section 7: grain.data is an array of change objects.
            # Each change object has:
            #   - topic: path to the resource, e.g., "/devices/device_uuid"
            #   - pre: resource state before change (or null if new)
            #   - post: resource state after change (or null if deleted)
            if not isinstance(change_wrapper, dict) or "topic" not in change_wrapper:
                logger.warning(f"grain.data 中的条目格式不正确，缺少 'topic': {str(change_wrapper)[:200]}")
                continue

            topic = change_wrapper.get("topic", "") # Path to the resource
            pre_data = change_wrapper.get("pre")
            post_data = change_wrapper.get("post")

            resource_id_from_topic = topic.split('/')[-1] # simplistic way to get ID

            if post_data is not None: # Resource created or updated
                # post_data is the new state of the resource
                if process_resource_update(post_data):
                    updates_processed_count += 1
            elif pre_data is not None and post_data is None: # Resource deleted
                # pre_data was the old state, post_data is null
                logger.info(f"检测到资源删除信号 (post is null, pre exists) for topic: {topic}, ID: {resource_id_from_topic}")
                if process_resource_deletion(resource_id_from_topic):
                    updates_processed_count +=1
            else:
                logger.debug(f"收到的 grain.data 条目既无 post 也无 pre 数据 (或 post 非 null): {str(change_wrapper)[:200]}")
        
        if updates_processed_count > 0:
            logger.info(f"通过 WebSocket 处理了 {updates_processed_count} 个资源的创建/更新/删除。")

    except json.JSONDecodeError:
        logger.error(f"解析WebSocket消息失败: {message_str[:200]}")
    except Exception as e:
        logger.error(f"处理WebSocket消息时发生错误: {e}", exc_info=True)


@app.get("/discover", summary="Discover resources by querying the NMOS Registry")
async def discover_resources():
    """通过查询API发现NMOS资源，并用其重置/更新本地缓存。"""
    global nmos_resources, known_resource_ids
    if not registry_url:
        raise HTTPException(status_code=503, detail="NMOS 注册中心 URL 尚未配置。")

    try:
        # IS-04 Query API /resources endpoint
        query_api_resources_url = f"{registry_url.rstrip('/')}/resources"
        
        logger.info(f"开始从 {query_api_resources_url} 发现资源...")
        response = requests.get(query_api_resources_url, timeout=10) # 增加超时
        response.raise_for_status() # 检查 HTTP 错误
        
        fetched_resource_list = response.json() # 这应该是一个资源对象的列表
        
        if not isinstance(fetched_resource_list, list):
            logger.error(f"从 {query_api_resources_url} 获取的资源不是列表格式，而是 {type(fetched_resource_list)}。")
            raise HTTPException(status_code=500, detail="从注册中心获取的资源格式不正确。")

        logger.info(f"从注册中心发现 {len(fetched_resource_list)} 个资源条目。")

        # 重置本地缓存前，可以考虑与现有缓存进行更智能的合并或比较
        # 但对于 /discover 操作，通常意味着获取全新快照
        new_nmos_resources_state: Dict[str, Dict[str, Any]] = {
            "nodes": {}, "devices": {}, "senders": {}, 
            "receivers": {}, "sources": {}, "flows": {}
        }
        new_known_resource_ids_state: Dict[str, str] = {}
        
        processed_count = 0
        for resource in fetched_resource_list:
            if not isinstance(resource, dict) or "id" not in resource or "type" not in resource:
                logger.warning(f"发现的资源格式不正确或缺少id/type: {str(resource)[:200]}")
                continue
            
            res_id = resource["id"]
            res_type_singular = resource["type"]
            res_type_plural = res_type_singular + "s"

            if res_type_plural in new_nmos_resources_state:
                new_nmos_resources_state[res_type_plural][res_id] = resource
                new_known_resource_ids_state[res_id] = res_type_plural
                processed_count +=1
            else:
                logger.warning(f"发现未知资源类型: '{res_type_singular}' (ID: {res_id})")
        
        # 原子地更新全局状态 (或者使用锁 threading.Lock 如果有并发访问)
        nmos_resources = new_nmos_resources_state
        known_resource_ids = new_known_resource_ids_state
        
        logger.info(f"资源缓存已通过 /discover 更新，处理了 {processed_count} 个有效资源。")
        # 返回处理后的资源摘要，而不是整个资源列表（可能非常大）
        return {
            "message": "资源发现并更新缓存成功。",
            "processed_resource_count": processed_count,
            "resource_summary": {key: len(value) for key, value in nmos_resources.items()}
        }
        
    except requests.exceptions.HTTPError as e:
        logger.error(f"请求注册服务 {query_api_resources_url} 失败: {e.response.status_code} - {e.response.text if e.response else str(e)}")
        raise HTTPException(status_code=e.response.status_code if e.response else 503, 
                            detail=f"资源发现失败 (HTTP Error): {e.response.text if e.response else str(e)}")
    except requests.exceptions.RequestException as e:
        logger.error(f"请求注册服务 {query_api_resources_url} 发生网络错误: {e}")
        raise HTTPException(status_code=503, detail=f"资源发现失败 (Network Error): {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"解析从 {query_api_resources_url} 获取的资源失败: {e}")
        raise HTTPException(status_code=500, detail=f"资源发现失败 (JSON Parse Error): {str(e)}")
    except Exception as e:
        logger.error(f"资源发现过程中发生未知错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"资源发现错误: {str(e)}")


def on_error(ws, error):
    """处理WebSocket错误"""
    logger.error(f"WebSocket错误: {error}", exc_info=True) # 添加 exc_info=True 获取堆栈跟踪

def on_close(ws, close_status_code, close_msg):
    """处理WebSocket关闭"""
    logger.info(f"WebSocket连接已关闭。状态码: {close_status_code}, 消息: {close_msg}")
    global ws_connection, ws_thread
    ws_connection = None 
    ws_thread = None # 清理线程引用，允许重连逻辑重新创建
    # 可以在这里添加延迟重连逻辑，如果 run_forever 不自动处理的话
    # asyncio.create_task(schedule_websocket_reconnect()) # 如果在async上下文中

def on_open(ws):
    """处理WebSocket打开"""
    logger.info("WebSocket连接已建立")


@app.on_event("startup")
async def startup_event_handler():
    global registry_url
    env_registry_url = os.getenv("NMOS_EXTERNAL_REGISTRY_URL")
    if env_registry_url:
        if registry_url and registry_url != env_registry_url: # registry_url 可能已被其他方式设置
            logger.info(f"环境变量 NMOS_EXTERNAL_REGISTRY_URL ('{env_registry_url}') 将覆盖已有的 registry_url ('{registry_url}')。")
        registry_url = env_registry_url
        logger.info(f"从环境变量加载 NMOS 注册中心 URL: {registry_url}")
    
    if registry_url:
        # 初始发现一次资源
        try:
            await discover_resources()
        except HTTPException as e: # discover_resources 抛出 HTTPException
            logger.error(f"启动时首次发现资源失败: {e.status_code} - {e.detail}")
        except Exception as e:
            logger.error(f"启动时首次发现资源发生未知错误: {e}", exc_info=True)

        # 然后启动 WebSocket 订阅
        start_websocket_subscription()
    else:
        logger.info("NMOS 注册中心 URL 尚未配置。请通过 POST /configure 或设置 NMOS_EXTERNAL_REGISTRY_URL 环境变量进行配置。")

@app.get("/resources", summary="Get current cached NMOS resources")
async def get_resources_api(): # Renamed from get_resources to avoid conflict if used as var
    """获取当前缓存的NMOS资源。将字典转换为列表以适应API。"""
    # 将字典转换为列表以供API返回（如果客户端期望列表）
    output_resources = {}
    for resource_type, resources_dict in nmos_resources.items():
        output_resources[resource_type] = list(resources_dict.values())
    return output_resources

@app.get("/health")
async def health_check():
    """健康检查端点"""
    ws_status = "disconnected"
    if ws_connection and ws_connection.sock and ws_connection.sock.connected:
        ws_status = "connected"
    elif ws_thread and ws_thread.is_alive():
        ws_status = "connecting_or_alive_but_socket_issue"


    return {
        "status": "ok",
        "nmos_registry_url": registry_url,
        "websocket_status": ws_status,
        "cached_resources_count": {
            key: len(value) for key, value in nmos_resources.items()
        }
    }

@app.on_event("shutdown")
async def shutdown_event_handler():
    logger.info("NMOS Registry Service 正在关闭...")
    if ws_connection:
        logger.info("正在关闭 WebSocket 连接...")
        ws_connection.close()
    if ws_thread and ws_thread.is_alive():
        logger.info("等待 WebSocket 线程结束...")
        ws_thread.join(timeout=5)
    logger.info("NMOS Registry Service 已关闭。")


if __name__ == "__main__":
    import uvicorn
    api_port = int(os.getenv("API_PORT", "8000"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    
    logger.info(f"启动 NMOS Registry Service 在端口 {api_port}，日志级别 {log_level}")
    uvicorn.run(app, host="0.0.0.0", port=api_port, log_level=log_level)
