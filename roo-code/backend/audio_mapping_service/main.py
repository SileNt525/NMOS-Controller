"""
Roo Code - 音频映射服务 (IS-08)
此服务负责处理NMOS IS-08音频通道映射功能，包括通道静音、交换和重新路由等操作。
"""

import logging
import json
import requests
import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional # 新增 Optional

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Roo Code - 音频映射服务 (IS-08)")

# --- Configuration from Environment Variables ---
# URL for the NMOS Registry Service
REGISTRY_SERVICE_URL = os.getenv("REGISTRY_SERVICE_URL")
if not REGISTRY_SERVICE_URL:
    logger.error("环境变量 REGISTRY_SERVICE_URL 未设置。音频映射服务可能无法正确获取设备信息。")

# --- IS-08 Control URNs ---
# 根据 AMWA IS-08 v1.0 规范，核心是 Channel Mapping Control API
ACCEPTABLE_IS08_CAP_MAP_CONTROL_URNS = [
    "urn:x-nmos:control:cap-map/v1.0", # Channel Mapping Control API
    # 如果有其他已知或厂商特定的 IS-08 URNs，可以在此添加
    # 例如 "urn:x-nmos:control:is08/v1.0" (如果某些设备使用这个更通用的)
]

class AudioMappingRequest(BaseModel):
    device_id: str
    operation: str 
    params: Dict[str, Any] = {} 

class DeviceInfo(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    tags: Optional[Dict[str, List[str]]] = None
    caps: Optional[Dict] = None
    controls: Optional[List[Dict]] = []
    is08_control_hrefs: List[str] = []

def get_nmos_device_from_registry(device_id: str) -> Optional[Dict[str, Any]]:
    """辅助函数：从注册服务获取单个NMOS Device资源。"""
    if not REGISTRY_SERVICE_URL:
        logger.error("内部错误: 注册服务URL未配置，无法获取设备资源。")
        return None

    try:
        registry_resources_url = f"{REGISTRY_SERVICE_URL.rstrip('/')}/resources"
        response = requests.get(registry_resources_url, timeout=5)
        response.raise_for_status()
        
        all_resources = response.json()
        # 假设 nmos_registry_service 返回的 /resources 包含按类型组织的字典，每个类型下又是资源ID到资源对象的字典
        if "devices" in all_resources and isinstance(all_resources["devices"], dict):
            return all_resources["devices"].get(device_id)
        else:
            logger.warning(f"注册服务响应中 'devices' 不是预期的字典格式或不存在。Response keys: {list(all_resources.keys())}")
            return None # 或者尝试旧的列表格式作为回退
            
    except requests.exceptions.RequestException as e:
        logger.error(f"请求注册服务 ({registry_resources_url}) 获取设备 '{device_id}' 失败: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"解析注册服务对设备 '{device_id}' 的响应失败: {e}")
        return None

def find_is08_control_hrefs_for_device(device_resource: Dict[str, Any]) -> List[str]:
    """
    从Device资源的controls数组中查找所有匹配的IS-08 Channel Mapping控制端点URL。
    返回找到的href列表。
    """
    found_hrefs = []
    if not device_resource or not isinstance(device_resource.get("controls"), list):
        return found_hrefs
    
    device_id_for_log = device_resource.get('id', 'UnknownDevice')
    
    for control in device_resource["controls"]:
        control_type = control.get("type")
        control_href = control.get("href")
        if control_href:
            # 优先检查明确定义的 IS-08 Channel Mapping URNs
            if control_type in ACCEPTABLE_IS08_CAP_MAP_CONTROL_URNS:
                logger.debug(f"在设备 '{device_id_for_log}' 中发现精确匹配的 IS-08 cap-map control: type='{control_type}', href='{control_href}'")
                if control_href not in found_hrefs: #避免重复添加
                    found_hrefs.append(control_href)
            # 作为回退，可以检查更通用的包含 "is-08" 或 "cap-map" 的URN，但需谨慎
            elif control_type and ("is-08" in control_type.lower() or "cap-map" in control_type.lower()):
                logger.debug(f"在设备 '{device_id_for_log}' 中发现通用匹配的 IS-08/cap-map control: type='{control_type}', href='{control_href}'")
                if control_href not in found_hrefs:
                    found_hrefs.append(control_href)
    
    if not found_hrefs:
        logger.warning(f"在设备 '{device_id_for_log}' 的 controls 中未找到已知的 IS-08 (cap-map) 控制类型。Controls: {device_resource.get('controls')}")
    
    return found_hrefs


@app.get("/is08-devices", response_model=List[DeviceInfo], summary="List IS-08 capable devices")
async def get_is08_capable_devices():
    if not REGISTRY_SERVICE_URL:
        raise HTTPException(status_code=503, detail="注册服务URL未配置，无法获取设备列表。")

    is08_devices_info = []
    try:
        registry_resources_url = f"{REGISTRY_SERVICE_URL.rstrip('/')}/resources"
        response = requests.get(registry_resources_url, timeout=5)
        response.raise_for_status()
        all_resources = response.json()

        if "devices" in all_resources and isinstance(all_resources["devices"], dict):
            # nmos_registry_service 现在返回的是字典
            for device_id, device_data in all_resources["devices"].items():
                if not isinstance(device_data, dict): # Sanity check
                    logger.warning(f"设备数据格式不正确 (非字典) for ID {device_id}。跳过。")
                    continue

                is08_hrefs_found = find_is08_control_hrefs_for_device(device_data)
                if is08_hrefs_found:
                    device_info = DeviceInfo(
                        id=device_id,
                        label=device_data.get("label", "N/A"),
                        description=device_data.get("description"),
                        tags=device_data.get("tags"),
                        caps=device_data.get("caps"),
                        controls=device_data.get("controls"),
                        is08_control_hrefs=is08_hrefs_found # Store all found hrefs
                    )
                    is08_devices_info.append(device_info)
            
            logger.info(f"发现 {len(is08_devices_info)} 个支持 IS-08 (cap-map) 的设备。")
            return is08_devices_info
        else:
            logger.warning(f"注册服务响应中 'devices' 不是预期的字典格式或不存在。All keys: {list(all_resources.keys())}")
            return []
            
    except requests.exceptions.RequestException as e:
        logger.error(f"请求注册服务 ({registry_resources_url}) 获取设备列表失败: {e}")
        raise HTTPException(status_code=503, detail=f"无法连接到注册服务或注册服务响应错误: {str(e)}")
    except json.JSONDecodeError as e:
        logger.error(f"解析注册服务对设备列表的响应失败: {e}")
        raise HTTPException(status_code=500, detail="解析注册服务响应失败。")
    except Exception as e:
        logger.error(f"获取 IS-08 设备列表时发生未知错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取IS-08设备列表时发生未知错误: {str(e)}")

@app.post("/perform-operation", summary="Perform an IS-08 audio mapping operation")
async def perform_audio_mapping(request: AudioMappingRequest):
    logger.info(f"收到音频映射请求: 设备 ID '{request.device_id}', 操作 '{request.operation}', 参数 '{request.params}'")

    if not REGISTRY_SERVICE_URL:
        raise HTTPException(status_code=503, detail="注册服务URL未配置，无法处理音频映射请求。")
    if not request.device_id or not request.operation:
        raise HTTPException(status_code=400, detail="缺少 device_id 或 operation 参数。")

    device_resource = get_nmos_device_from_registry(request.device_id)
    if not device_resource:
        raise HTTPException(status_code=404, detail=f"设备 ID '{request.device_id}' 未在注册表中找到。")

    is08_control_hrefs = find_is08_control_hrefs_for_device(device_resource)
    if not is08_control_hrefs:
        raise HTTPException(status_code=400, detail=f"设备 ID '{request.device_id}' 未找到兼容的 IS-08 (cap-map) 控制端点。无法执行操作。")

    # 使用第一个发现的 IS-08 cap-map 控制端点。
    # 如果一个设备暴露了多个 IS-08 cap-map 相关的控制端点（不常见），
    # 可能需要更复杂的逻辑来选择，或允许客户端指定。
    base_is08_control_url = is08_control_hrefs[0].rstrip('/')
    logger.info(f"将使用 IS-08 (cap-map) 控制端点: {base_is08_control_url} 为设备 '{request.device_id}'")

    # IS-08 操作逻辑:
    # 此部分仍然高度依赖于具体的 IS-08 API 结构和目标操作。
    # 以下是一个示例，演示如何根据 operation 字段构造目标 URL 和 payload。
    # 客户端 (如前端) 需要知道如何构造 'operation' 和 'params' 以匹配此逻辑。
    
    command_url: Optional[str] = None
    http_method: str = "PATCH" # IS-08 Channel Mapping 通常使用 PATCH
    payload: Optional[Dict[str, Any]] = None

    if request.operation == "patch_output_properties":
        # 示例: 修改输出通道的属性 (例如静音)
        # params: {"output_id": "OUT_1", "properties_to_patch": {"muted": true}}
        output_id = request.params.get("output_id")
        properties_to_patch = request.params.get("properties_to_patch")
        if not output_id or properties_to_patch is None: # properties_to_patch can be an empty dict
            raise HTTPException(status_code=400, detail="对于 'patch_output_properties' 操作，需要 'output_id' 和 'properties_to_patch' 参数。")
        
        # IS-08 v1.0 /map/active/outputs/{outputId}/properties
        command_url = f"{base_is08_control_url}/map/active/outputs/{output_id}/properties"
        payload = properties_to_patch

    elif request.operation == "patch_input_routing":
        # 示例: 修改输入通道的路由 (从哪个源获取音频)
        # params: {"input_id": "IN_1", "routing_params": {"source_id": "source_uuid", "channel_index": 0}}
        # 假设 IS-08 API 路径是 /map/active/inputs/{inputId}/routing
        input_id = request.params.get("input_id")
        routing_params = request.params.get("routing_params")
        if not input_id or not routing_params:
            raise HTTPException(status_code=400, detail="对于 'patch_input_routing' 操作，需要 'input_id' 和 'routing_params' 参数。")
        
        command_url = f"{base_is08_control_url}/map/active/inputs/{input_id}/routing"
        payload = routing_params # routing_params 应该是 IS-08 定义的路由对象

    elif request.operation == "get_active_map":
        # 示例: 获取整个活动映射
        # params: {} (不需要参数)
        command_url = f"{base_is08_control_url}/map/active"
        http_method = "GET"
        payload = None

    # 可以根据需要添加更多 IS-08 操作 (e.g., get_input_properties, get_output_routing)
    
    else:
        logger.warning(f"未知的 IS-08 操作 '{request.operation}'。请检查操作名称或在服务中实现它。")
        raise HTTPException(status_code=400, detail=f"不支持的 IS-08 操作 '{request.operation}'。")

    if not command_url: # Should have been set by one of the operation handlers
         raise HTTPException(status_code=500, detail=f"内部服务器错误：未能为操作 '{request.operation}' 构建命令 URL。")

    logger.info(f"向设备 IS-08 端点发送 {http_method} 请求: URL='{command_url}', Payload='{json.dumps(payload) if payload is not None else 'None'}'")
    try:
        if http_method == "PATCH":
            response = requests.patch(command_url, json=payload, timeout=10)
        elif http_method == "POST":
             response = requests.post(command_url, json=payload, timeout=10)
        elif http_method == "GET":
            response = requests.get(command_url, timeout=10)
        elif http_method == "PUT":
            response = requests.put(command_url, json=payload, timeout=10)
        else:
            logger.error(f"不支持的 HTTP 方法 {http_method} 用于 IS-08 操作。")
            raise NotImplementedError(f"HTTP 方法 {http_method} 尚未实现。")
            
        response.raise_for_status()
        
        response_data = response.json() if response.content and response.headers.get('content-type', '').startswith('application/json') else {"message": "操作成功，无 JSON 响应内容或响应为空。"}
        logger.info(f"IS-08 操作 '{request.operation}' 成功。设备响应: {response_data}")
        return {"status": "success", "result": response_data, "target_url": command_url}

    except requests.exceptions.HTTPError as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"{http_method} 请求到 {command_url} 失败: {e.response.status_code if e.response else 'N/A'} - {error_detail}")
        raise HTTPException(status_code=e.response.status_code if e.response else 503, 
                            detail=f"IS-08 操作失败 ({http_method} {command_url}): {error_detail}")
    except requests.exceptions.RequestException as e:
        logger.error(f"{http_method} 请求到 {command_url} 发生网络错误: {e}")
        raise HTTPException(status_code=503, detail=f"IS-08 操作时发生网络错误 (连接到 {command_url}): {str(e)}")
    except Exception as e:
        logger.error(f"执行音频映射操作时发生未知错误: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"执行音频映射操作时发生未知错误: {str(e)}")


@app.get("/health", summary="Health check endpoint")
async def health_check():
    registry_status = "unknown"
    if not REGISTRY_SERVICE_URL:
        registry_status = "unconfigured"
    else:
        try:
            registry_health_url = f"{REGISTRY_SERVICE_URL.rstrip('/')}/health"
            response = requests.get(registry_health_url, timeout=2)
            if response.status_code == 200:
                registry_status = "ok"
            else:
                registry_status = f"error_status_{response.status_code}"
        except requests.exceptions.RequestException:
            registry_status = "unreachable"
            
    return {
        "status": "ok",
        "service_name": "AudioMappingService",
        "dependencies": {
            "registry_service": {
                "url": REGISTRY_SERVICE_URL if REGISTRY_SERVICE_URL else "Not Configured",
                "status": registry_status
            }
        }
    }

if __name__ == '__main__':
    import uvicorn
    api_port = int(os.getenv("API_PORT", "8003"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()

    logger.info(f"启动音频映射服务 (IS-08) 在端口 {api_port}，日志级别: {log_level}")
    logger.info(f"NMOS 注册服务 URL: {REGISTRY_SERVICE_URL}")
    
    uvicorn.run(app, host="0.0.0.0", port=api_port, log_level=log_level)
