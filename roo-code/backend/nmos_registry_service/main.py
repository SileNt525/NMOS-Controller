from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field # 新增 Field
import requests
from jose import JWTError, jwt
from datetime import datetime, timedelta
import websocket
import json
import threading
import asyncio
import logging
import os
from typing import Dict, List, Any, Optional
import security_config # 导入安全配置 

app = FastAPI(title="NMOS Registry Service (IS-04)")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

nmos_resources: Dict[str, Dict[str, Any]] = {
    "nodes": {}, "devices": {}, "senders": {},
    "receivers": {}, "sources": {}, "flows": {}
}
known_resource_ids: Dict[str, str] = {}

registry_url: Optional[str] = None
ws_connection: Optional[websocket.WebSocketApp] = None
ws_thread: Optional[threading.Thread] = None

# --- Pydantic Models for API Responses ---
class ResourceModel(BaseModel): # 基础的NMOS资源模型 (可以更具体)
    id: str
    type: str
    # ... 其他通用字段，或者使用 AnyResource = Dict[str, Any]
    # 为了简单起见，我们假设资源是字典

class ResourcesResponse(BaseModel):
    nodes: List[Dict[str, Any]] # 或者 List[ResourceModel] 如果定义了更具体的模型
    devices: List[Dict[str, Any]]
    senders: List[Dict[str, Any]]
    receivers: List[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    flows: List[Dict[str, Any]]

class CachedCounts(BaseModel):
    nodes: int
    devices: int
    senders: int
    receivers: int
    sources: int
    flows: int

class HealthResponse(BaseModel):
    status: str
    nmos_registry_url: Optional[str] = None
    websocket_status: str
    cached_resources_count: CachedCounts

class DiscoverResponse(BaseModel):
    message: str
    processed_resource_count: int
    resource_summary: Dict[str, int]

class RegistryConfig(BaseModel):
    registry_address: str
    registry_port: int

class ConfigureResponse(BaseModel):
    message: str
    url: Optional[str] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

# JWT认证配置
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.now(datetime.timezone.utc) + timedelta(minutes=security_config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, security_config.SECRET_KEY, algorithm=security_config.ALGORITHM)
    return encoded_jwt

# 获取当前登录用户 (使用JWT token)
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security_config.SECRET_KEY, algorithms=[security_config.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = security_config.USERS.get(username)
    if user is None:
        raise credentials_exception
    return user


# --- Helper Functions (与之前相同，为简洁省略，但它们应该在这里) ---
def start_websocket_subscription():
    global registry_url, ws_connection, ws_thread
    if ws_thread and ws_thread.is_alive():
        logger.info("WebSocket 线程已在运行。如果需要更改 URL，请先停止现有连接。")
        if ws_connection:
             logger.info("正在关闭现有 WebSocket 连接...")
             ws_connection.close() 
             ws_thread.join(timeout=5) 
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

def process_resource_update(resource_data: Dict):
    global nmos_resources, known_resource_ids
    if not isinstance(resource_data, dict) or "id" not in resource_data or "type" not in resource_data:
        logger.warning(f"收到的资源格式不正确或缺少id/type: {str(resource_data)[:200]}")
        return False
    resource_id = resource_data["id"]
    resource_type_singular = resource_data["type"]
    resource_type_plural = resource_type_singular + "s"
    if resource_type_plural not in nmos_resources:
        logger.warning(f"未知的资源类型复数形式: '{resource_type_plural}' (来自单数 '{resource_type_singular}')")
        return False
    existing_resource = nmos_resources[resource_type_plural].get(resource_id)
    if existing_resource:
        # 基本的版本比较逻辑 (假设版本是 <seconds>:<nanoseconds> 字符串)
        # NMOS IS-04 v1.3 specifies version as "seconds:nanoseconds"
        new_version_str = resource_data.get("version")
        old_version_str = existing_resource.get("version")
        if new_version_str and old_version_str:
            try:
                new_sec, new_nano = map(int, new_version_str.split(':'))
                old_sec, old_nano = map(int, old_version_str.split(':'))
                if new_sec < old_sec or (new_sec == old_sec and new_nano <= old_nano):
                    logger.info(f"接收到的资源 {resource_type_plural}/{resource_id} 版本 ('{new_version_str}') 不比现有版本 ('{old_version_str}') 新，跳过更新。")
                    return False # 不更新
            except ValueError:
                logger.warning(f"资源 {resource_type_plural}/{resource_id} 的版本号格式不正确 ('{new_version_str}' 或 '{old_version_str}')，将直接更新。")
        logger.info(f"更新资源 {resource_type_plural}/{resource_id}")
    else:
        logger.info(f"新增资源 {resource_type_plural}/{resource_id}")
    
    # 版本适配逻辑：检查资源版本并处理字段差异
    resource_version = resource_data.get("version", "")
    if ":" in resource_version:
        # 假设版本格式为 "seconds:nanoseconds" 表示 v1.3
        logger.debug(f"处理资源 {resource_type_plural}/{resource_id}，版本 v1.3 检测到")
    else:
        # 假设其他格式或缺少版本字段可能为 v1.2 或更旧版本
        logger.debug(f"处理资源 {resource_type_plural}/{resource_id}，版本 v1.2 或更旧版本检测到")
        # 为 v1.2 版本添加缺失字段的默认值
        if resource_type_singular == "node":
            resource_data.setdefault("attached_network_device", None)
            resource_data.setdefault("authorization", False)
        elif resource_type_singular == "device":
            resource_data.setdefault("authorization", False)
        elif resource_type_singular in ["source", "flow"]:
            resource_data.setdefault("event_type", None)
    
    nmos_resources[resource_type_plural][resource_id] = resource_data
    known_resource_ids[resource_id] = resource_type_plural
    return True

def process_resource_deletion(resource_id: str):
    global nmos_resources, known_resource_ids
    if resource_id in known_resource_ids:
        resource_type_plural = known_resource_ids[resource_id]
        if resource_id in nmos_resources.get(resource_type_plural, {}):
            del nmos_resources[resource_type_plural][resource_id]
            del known_resource_ids[resource_id]
            logger.info(f"已删除资源 {resource_type_plural}/{resource_id} 从缓存。")
            return True
        else: 
            logger.warning(f"尝试删除资源 {resource_id} (类型 {resource_type_plural}), 但在 nmos_resources 中未找到。可能已被删除。")
            del known_resource_ids[resource_id] 
            return False
    else:
        logger.debug(f"尝试删除资源 {resource_id}, 但在 known_resource_ids 中未找到。可能已被删除或从未被添加。")
        return False

def on_message(ws, message_str: str):
    try:
        message_obj = json.loads(message_str)
        if not isinstance(message_obj, dict) or "grain" not in message_obj:
            logger.warning(f"收到的WebSocket消息不是预期的 grain 格式: {message_str[:200]}")
            return
        grain = message_obj["grain"]
        if not isinstance(grain, dict) or "data" not in grain or not isinstance(grain["data"], list):
            logger.warning(f"grain 格式不正确或 grain.data 不是列表: {str(grain)[:200]}")
            return
        updates_processed_count = 0
        for change_wrapper in grain["data"]:
            if not isinstance(change_wrapper, dict) or "topic" not in change_wrapper:
                logger.warning(f"grain.data 中的条目格式不正确，缺少 'topic': {str(change_wrapper)[:200]}")
                continue
            topic = change_wrapper.get("topic", "") 
            pre_data = change_wrapper.get("pre")
            post_data = change_wrapper.get("post")
            resource_id_from_topic = topic.split('/')[-1]
            if post_data is not None: 
                if process_resource_update(post_data):
                    updates_processed_count += 1
            elif pre_data is not None and post_data is None: 
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

def on_error(ws, error):
    logger.error(f"WebSocket错误: {error}", exc_info=True)

def on_close(ws, close_status_code, close_msg):
    logger.info(f"WebSocket连接已关闭。状态码: {close_status_code}, 消息: {close_msg}")
    global ws_connection, ws_thread
    ws_connection = None 
    ws_thread = None
    # 尝试自动重连，除非是显式关闭 (例如服务关闭时)
    # 这里简单处理，总是尝试重连，除非 close_status_code 表明是正常关闭
    # 实际应用中可能需要更复杂的逻辑来判断是否应该重连
    if close_status_code != 1000: # 1000 表示正常关闭
        logger.info(f"WebSocket 连接意外关闭 (code: {close_status_code})，将在5秒后尝试重连...")
        threading.Timer(5.0, start_websocket_subscription).start()

def on_open(ws):
    logger.info("WebSocket连接已建立")

# --- API Endpoints ---
@app.post("/configure", response_model=ConfigureResponse)
async def configure_registry(config: RegistryConfig, current_user_data: dict = Depends(get_current_user)):
    global registry_url
    old_url = registry_url
    registry_url = f"http://{config.registry_address}:{config.registry_port}"
    logger.info(f"NMOS注册中心已配置为: {registry_url}")
    if old_url != registry_url or (ws_thread is None or not ws_thread.is_alive()):
        logger.info("检测到 registry_url 更改或 WebSocket 未运行，正在尝试（重新）启动 WebSocket。")
        start_websocket_subscription()
    return ConfigureResponse(message="注册中心配置成功", url=registry_url)

@app.post("/users/change-password", summary="Change user password")
async def change_password(payload: UserPasswordChange, current_user_data: dict = Depends(get_current_user)):
    username = current_user_data.get("username")
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username not found in token/session")

    # 验证当前密码
    if not security_config.verify_password(username, payload.current_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")

    # 更新密码
    if security_config.update_user_password(username, payload.new_password):
        return {"message": "Password updated successfully"}
    else:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update password")

# 模拟登录以获取用户身份 (用于演示，实际应用应有完整登录流程)
# 如果前端已经有登录，并且可以传递用户名或用户ID，则不需要这个模拟登录
# 这里我们假设前端在调用 change-password 时能某种方式提供用户名
# 或者，如果使用token，get_current_user 会从token中提取用户

# 登录端点以获取JWT token
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # 查找用户，这里假设 username 字段直接对应 USERS 字典的键
    user = security_config.USERS.get(form_data.username)
    if not user or not security_config.verify_password(form_data.username, form_data.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建访问 token
    access_token_expires = timedelta(minutes=security_config.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/discover", summary="Discover resources by querying the NMOS Registry", response_model=DiscoverResponse)
async def discover_resources_api(current_user_data: dict = Depends(get_current_user)): # Renamed to avoid conflict
    global nmos_resources, known_resource_ids
    if not registry_url:
        raise HTTPException(status_code=503, detail="NMOS 注册中心 URL 尚未配置。")
    try:
        query_api_resources_url = f"{registry_url.rstrip('/')}/resources"
        logger.info(f"开始从 {query_api_resources_url} 发现资源...")
        response = requests.get(query_api_resources_url, timeout=10)
        response.raise_for_status()
        fetched_resource_list = response.json()
        if not isinstance(fetched_resource_list, list):
            logger.error(f"从 {query_api_resources_url} 获取的资源不是列表格式，而是 {type(fetched_resource_list)}。")
            raise HTTPException(status_code=500, detail="从注册中心获取的资源格式不正确。")
        logger.info(f"从注册中心发现 {len(fetched_resource_list)} 个资源条目。")
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
        nmos_resources = new_nmos_resources_state
        known_resource_ids = new_known_resource_ids_state
        logger.info(f"资源缓存已通过 /discover 更新，处理了 {processed_count} 个有效资源。")
        return DiscoverResponse(
            message="资源发现并更新缓存成功。",
            processed_resource_count=processed_count,
            resource_summary={key: len(value) for key, value in nmos_resources.items()}
        )
    except requests.exceptions.HTTPError as e:
        logger.error(f"请求注册服务 {query_api_resources_url} 失败: {e.response.status_code} - {e.response.text if e.response else str(e)}")
        raise HTTPException(status_code=e.response.status_code if e.response else 503, 
                            detail=f"资源发现失败 (HTTP Error): {e.response.text if e.response else str(e)}")
    except requests.exceptions.RequestException as e:
        logger.error(f"请求注册服务 {query_api_resources_url} 发生网络错误: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"资源发现失败 (Network Error): {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"解析从 {query_api_resources_url} 获取的资源失败: {e}")
        raise HTTPException(status_code=500, detail=f"资源发现失败 (JSON Parse Error): {str(e)}")
    except Exception as e:
        logger.error(f"资源发现过程中发生未知错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"资源发现错误: {str(e)}")

@app.on_event("startup")
async def startup_event_handler():
    global registry_url
    env_registry_url = os.getenv("NMOS_EXTERNAL_REGISTRY_URL")
    if env_registry_url:
        if registry_url and registry_url != env_registry_url:
            logger.info(f"环境变量 NMOS_EXTERNAL_REGISTRY_URL ('{env_registry_url}') 将覆盖已有的 registry_url ('{registry_url}')。")
        registry_url = env_registry_url
        logger.info(f"从环境变量加载 NMOS 注册中心 URL: {registry_url}")
    if registry_url:
        try:
            await discover_resources_api() # Call the renamed API function
        except HTTPException as e: 
            logger.error(f"启动时首次发现资源失败: {e.status_code} - {e.detail}")
        except Exception as e:
            logger.error(f"启动时首次发现资源发生未知错误: {e}", exc_info=True)
        start_websocket_subscription()
    else:
        logger.info("NMOS 注册中心 URL 尚未配置。请通过 POST /configure 或设置 NMOS_EXTERNAL_REGISTRY_URL 环境变量进行配置。")

@app.get("/resources", summary="Get current cached NMOS resources", response_model=ResourcesResponse)
async def get_resources_api_endpoint(current_user_data: dict = Depends(get_current_user)): # Renamed from get_resources_api to be more distinct
    output_resources = {}
    for resource_type_plural_key, resources_dict in nmos_resources.items():
        output_resources[resource_type_plural_key] = list(resources_dict.values())

    # Ensure all keys required by ResourcesResponse are present, even if empty
    for key_to_check in ResourcesResponse.model_fields.keys():
        if key_to_check not in output_resources:
            output_resources[key_to_check] = []

    return ResourcesResponse(**output_resources)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    ws_status = "disconnected"
    if ws_connection and ws_connection.sock and ws_connection.sock.connected:
        ws_status = "connected"
    elif ws_thread and ws_thread.is_alive():
        ws_status = "connecting_or_alive_but_socket_issue"

    counts = {key: len(value) for key, value in nmos_resources.items()}
    # Ensure all keys required by CachedCounts are present
    for key_to_check in CachedCounts.model_fields.keys():
        if key_to_check not in counts:
            counts[key_to_check] = 0

    return HealthResponse(
        status="ok",
        nmos_registry_url=registry_url,
        websocket_status=ws_status,
        cached_resources_count=CachedCounts(**counts)
    )

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
