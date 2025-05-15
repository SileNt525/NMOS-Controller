from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import requests
import json
import logging
import os
from typing import List, Dict, Any # 新增 List, Dict, Any

app = FastAPI(title="NMOS Connection Management Service (IS-05)")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 从环境变量读取NMOS注册服务的地址
REGISTRY_SERVICE_URL = os.getenv("REGISTRY_SERVICE_URL")
if not REGISTRY_SERVICE_URL:
    logger.error("环境变量 REGISTRY_SERVICE_URL 未设置。连接管理服务可能无法正常工作。")

# 可接受的 IS-05 控制 URNs (sender/receiver control)
# 根据 AMWA IS-05 规范版本
ACCEPTABLE_IS05_CONTROL_URNS = [
    "urn:x-nmos:control:sr-ctrl/v1.0",
    "urn:x-nmos:control:sr-ctrl/v1.1",
    # 可以根据需要添加更多版本
]

class ConnectionRequest(BaseModel):
    sender_id: str
    receiver_id: str
    transport_params: List[Dict[str, Any]] # IS-05 transport_params is an array of objects
    activation_mode: str = "activate_immediate"
    activation_time: str = None

class BulkConnectionRequest(BaseModel):
    connections: List[ConnectionRequest]


def get_nmos_resource_from_registry(resource_type_plural: str, resource_id: str) -> Dict[str, Any] | None:
    """
    辅助函数：从注册服务获取单个NMOS资源。
    resource_type_plural 应该是 "senders", "receivers", "devices" 等。
    """
    if not REGISTRY_SERVICE_URL:
        # 这个错误不应该直接暴露给客户端为 HTTPException，除非是请求处理的直接结果
        # 对于内部函数，最好是记录错误并返回 None 或抛出自定义内部异常
        logger.error("内部错误: 注册服务URL未配置，无法获取资源。")
        return None

    try:
        registry_resources_url = f"{REGISTRY_SERVICE_URL.rstrip('/')}/resources"
        response = requests.get(registry_resources_url, timeout=5)
        response.raise_for_status() 
        
        all_resources = response.json()
        if resource_type_plural in all_resources and isinstance(all_resources[resource_type_plural], dict):
            # nmos_registry_service 现在返回的是字典
            return all_resources[resource_type_plural].get(resource_id)
        elif resource_type_plural in all_resources and isinstance(all_resources[resource_type_plural], list):
            # Fallback if registry still returns lists (should be updated based on previous changes)
            logger.warning(f"注册服务为 '{resource_type_plural}' 返回了列表格式，期望字典格式。将进行线性搜索。")
            for resource in all_resources[resource_type_plural]:
                if resource.get("id") == resource_id:
                    return resource
            return None
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"请求注册服务 ({registry_resources_url}) 失败: {e}")
        # 同样，这个内部错误不应直接导致 HTTPException，除非在请求处理路径中
        return None # 或者抛出内部异常
    except json.JSONDecodeError as e:
        logger.error(f"解析注册服务响应失败: {e}")
        return None # 或者抛出内部异常

def find_is05_control_href_for_device(device_resource: Dict[str, Any]) -> str | None:
    """
    从Device资源的controls数组中查找合适的IS-05控制端点URL。
    优先选择列表中较新（较高版本号）的URN。
    """
    if not device_resource or not isinstance(device_resource.get("controls"), list):
        return None
    
    found_hrefs = {} # Store href by URN
    for control in device_resource["controls"]:
        control_type = control.get("type")
        control_href = control.get("href")
        if control_type in ACCEPTABLE_IS05_CONTROL_URNS and control_href:
            found_hrefs[control_type] = control_href
            logger.debug(f"在设备 '{device_resource.get('id')}' 中发现 IS-05 control: type='{control_type}', href='{control_href}'")

    if not found_hrefs:
        return None

    # 优先选择版本号较高的 URN (简单地按字符串排序，如果版本号在末尾)
    # 例如 "v1.1" > "v1.0"
    # 对 ACCEPTABLE_IS05_CONTROL_URNS 进行反向排序，以优先检查较新的版本
    for urn in sorted(ACCEPTABLE_IS05_CONTROL_URNS, reverse=True):
        if urn in found_hrefs:
            selected_href = found_hrefs[urn]
            logger.info(f"为设备 '{device_resource.get('id')}' 选择的 IS-05 control: type='{urn}', href='{selected_href}'")
            return selected_href
    
    return None # Should not be reached if found_hrefs is not empty


@app.post("/connect", summary="Create or update a single connection (IS-05)")
async def connect(request: ConnectionRequest):
    """
    发起或更新单个连接请求，根据 IS-05 标准操作 Receiver 的 /staged 和 /active 端点。
    """
    logger.info(f"收到连接请求: Sender {request.sender_id} -> Receiver {request.receiver_id}, Mode: {request.activation_mode}")

    try:
        # 确保注册服务URL已配置 (在请求处理的早期阶段检查)
        if not REGISTRY_SERVICE_URL:
            raise HTTPException(status_code=503, detail="注册服务URL未配置，无法处理连接请求。")

        sender = get_nmos_resource_from_registry("senders", request.sender_id)
        receiver = get_nmos_resource_from_registry("receivers", request.receiver_id)
        
        if not sender:
            raise HTTPException(status_code=404, detail=f"Sender with ID '{request.sender_id}' not found in registry.")
        if not receiver:
            raise HTTPException(status_code=404, detail=f"Receiver with ID '{request.receiver_id}' not found in registry.")
        
        device_id_of_receiver = receiver.get("device_id")
        if not device_id_of_receiver:
            # IS-04 Device ID is mandatory for Receivers
            raise HTTPException(status_code=400, detail=f"Receiver '{request.receiver_id}' 缺少必需的 device_id 属性。")

        device_of_receiver = get_nmos_resource_from_registry("devices", device_id_of_receiver)
        if not device_of_receiver:
            raise HTTPException(status_code=404, detail=f"Receiver '{request.receiver_id}' 的父设备 '{device_id_of_receiver}' 未在注册表中找到。")

        is05_control_href = find_is05_control_href_for_device(device_of_receiver)
        
        if not is05_control_href:
            logger.error(f"在设备 '{device_id_of_receiver}' (Receiver: {request.receiver_id}) 的 'controls' 中未找到兼容的 IS-05 sr-ctrl 端点。Controls: {device_of_receiver.get('controls')}")
            raise HTTPException(status_code=400, detail=f"设备 '{device_id_of_receiver}' 未提供兼容的 IS-05 (sr-ctrl) 控制端点。")

        patch_data_staged = {
            "sender_id": request.sender_id if request.sender_id else None, # sender_id can be null to disconnect
            "master_enable": True, # 通常设为 true 以尝试激活连接
            "activation": {"mode": request.activation_mode}
        }
        # IS-05 transport_params is an array. Even for a single set of params, it should be in an array.
        if request.transport_params:
             # Ensure transport_params is always an array, even if API spec for ConnectionRequest was simplified
            if isinstance(request.transport_params, list):
                patch_data_staged["transport_params"] = request.transport_params
            else: # Should not happen if Pydantic model is List[Dict[...]]
                logger.warning("transport_params 应该是一个列表，但收到了单个对象。将尝试包装为列表。")
                patch_data_staged["transport_params"] = [request.transport_params]
        
        if request.activation_time and request.activation_mode in ["activate_scheduled_absolute", "activate_scheduled_relative"]:
            patch_data_staged["activation"]["requested_time"] = request.activation_time
        
        staged_patch_url = f"{is05_control_href.rstrip('/')}/single/receivers/{request.receiver_id}/staged"
        
        logger.info(f"向 Receiver '{request.receiver_id}' 的 staged 端点发送 PATCH 请求: URL='{staged_patch_url}', Data='{json.dumps(patch_data_staged)}'")
        
        try:
            patch_response_staged = requests.patch(staged_patch_url, json=patch_data_staged, timeout=10)
            patch_response_staged.raise_for_status()
            
            staged_config = patch_response_staged.json() # This is the new staged configuration
            logger.info(f"Receiver '{request.receiver_id}' 的 /staged 端点配置成功。响应: {staged_config}")
            
            # 对于 "activate_immediate", 设备应在 /staged PATCH 成功后立即（或尽快）激活。
            # IS-05规范指出: "A change to /staged is actioned by a subsequent PATCH to /active..."
            # "The body of this PATCH request MUST include `mode`: `activate_immediate`"
            # 然而, 也提到: "If the `mode` parameter within the `activation` object in `/staged` is set to `activate_immediate`,
            # the Node MAY choose to automatically action this change as if an immediate activation had also been requested via `/active`."
            # 为确保行为一致性，如果模式是 activate_immediate，我们可以显式地 PATCH /active。
            
            if request.activation_mode == "activate_immediate":
                active_patch_url = f"{is05_control_href.rstrip('/')}/single/receivers/{request.receiver_id}/active"
                active_payload = {"mode": "activate_immediate"} # Per IS-05 spec for PATCH to /active
                logger.info(f"为立即激活模式，向 Receiver '{request.receiver_id}' 的 active 端点发送 PATCH 请求: URL='{active_patch_url}', Data='{json.dumps(active_payload)}'")
                try:
                    patch_response_active = requests.patch(active_patch_url, json=active_payload, timeout=10)
                    patch_response_active.raise_for_status()
                    active_config_response = patch_response_active.json() # This is the current active configuration
                    logger.info(f"Receiver '{request.receiver_id}' 的 /active 端点 PATCH 成功。响应: {active_config_response}")
                    # 返回 /staged 的结果，因为它代表了我们请求的变更。/active 的响应是当前激活的状态。
                    return {"message": "连接请求已成功发送到 Receiver 的 staged 和 active 端点 (立即激活)。", 
                            "staged_configuration": staged_config,
                            "active_configuration_after_patch": active_config_response
                           }
                except requests.exceptions.HTTPError as e_active:
                    logger.error(f"PATCH 请求到 {active_patch_url} (active 端点) 失败: {e_active.response.status_code} - {e_active.response.text if e_active.response else str(e_active)}")
                    # 即使 /active PATCH 失败，/staged 可能已成功。如何处理这种情况？
                    # 可以认为操作部分成功，或整体失败。
                    raise HTTPException(status_code=e_active.response.status_code if e_active.response else 500, 
                                        detail=f"配置 staged 端点成功，但激活 active 端点失败: {e_active.response.text if e_active.response else str(e_active)}")
                except requests.exceptions.RequestException as e_active_net:
                    logger.error(f"PATCH 请求到 {active_patch_url} (active 端点) 发生网络错误: {e_active_net}")
                    raise HTTPException(status_code=503, detail=f"连接到 Receiver 的 active 端点时发生网络错误: {str(e_active_net)}")
            else: # For scheduled activations, only /staged is patched by this request.
                return {"message": "连接请求已成功发送到 Receiver 的 staged 端点 (计划激活)。", 
                        "staged_configuration": staged_config}

        except requests.exceptions.HTTPError as e_staged:
            logger.error(f"PATCH 请求到 {staged_patch_url} (staged 端点) 失败: {e_staged.response.status_code} - {e_staged.response.text if e_staged.response else str(e_staged)}")
            raise HTTPException(status_code=e_staged.response.status_code if e_staged.response else 500, 
                                detail=f"连接到 Receiver 的 staged 端点失败: {e_staged.response.text if e_staged.response else str(e_staged)}")
        except requests.exceptions.RequestException as e_staged_net:
            logger.error(f"PATCH 请求到 {staged_patch_url} (staged 端点) 发生网络错误: {e_staged_net}")
            raise HTTPException(status_code=503, detail=f"连接到 Receiver 的 staged 端点时发生网络错误: {str(e_staged_net)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"处理连接请求时发生未知错误: Sender {request.sender_id} -> Receiver {request.receiver_id}. Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"处理连接请求时发生未知错误: {str(e)}")


@app.get("/connection_status/{receiver_id}", summary="Get connection status for a Receiver")
async def get_connection_status(receiver_id: str):
    logger.info(f"请求 Receiver '{receiver_id}' 的连接状态。")
    try:
        if not REGISTRY_SERVICE_URL:
            raise HTTPException(status_code=503, detail="注册服务URL未配置。")

        receiver = get_nmos_resource_from_registry("receivers", receiver_id)
        if not receiver:
            raise HTTPException(status_code=404, detail=f"Receiver with ID '{receiver_id}' not found in registry.")
        
        subscription_info = receiver.get("subscription", {})
        active_sender_id = subscription_info.get("sender_id")
        is_active = subscription_info.get("active", False)

        status_detail = {
            "receiver_id": receiver_id,
            "active": is_active,
            "connected_sender_id": active_sender_id,
            "full_subscription_object": subscription_info,
        }
        
        if is_active and active_sender_id:
            logger.info(f"Receiver '{receiver_id}' 当前已连接到 Sender '{active_sender_id}'。")
            return {"status": "connected", "details": status_detail}
        elif is_active and not active_sender_id: # Active but sender_id is null (e.g. explicitly disconnected)
            logger.info(f"Receiver '{receiver_id}' 状态为 active 但 sender_id 为 null。")
            return {"status": "active_disconnected", "details": status_detail}
        else: # Not active
            logger.info(f"Receiver '{receiver_id}' 当前未激活。")
            return {"status": "inactive", "details": status_detail}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取 Receiver '{receiver_id}' 连接状态时出错: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"获取连接状态时出错: {str(e)}")


@app.post("/bulk_connect", summary="Create or update multiple connections (IS-05 Bulk)")
async def bulk_connect(request: BulkConnectionRequest):
    logger.info(f"收到批量连接请求，包含 {len(request.connections)} 个连接。")
    results = []
    successful_connections = 0
    failed_connections = 0

    # IS-05 Bulk操作通常针对同一个Node API上的多个sender/receiver。
    # 一个更优化的实现会按目标Node API (即is05_control_href) 分组连接请求，
    # 然后为每个Node API构造单个 /bulk PATCH请求。
    # 当前实现仍是逐个处理，但使用了共享的 `connect` 逻辑。
    for conn_req_data in request.connections:
        try:
            single_result = await connect(conn_req_data) 
            results.append({
                "sender_id": conn_req_data.sender_id,
                "receiver_id": conn_req_data.receiver_id,
                "status": "success", 
                "detail": single_result
            })
            successful_connections += 1
        except HTTPException as e:
            results.append({
                "sender_id": conn_req_data.sender_id,
                "receiver_id": conn_req_data.receiver_id,
                "status": "failed",
                "error_code": e.status_code,
                "detail": e.detail
            })
            failed_connections += 1
        except Exception as e:
            logger.error(f"批量连接中处理 Sender {conn_req_data.sender_id} -> Receiver {conn_req_data.receiver_id} 时发生意外错误: {str(e)}", exc_info=True)
            results.append({
                "sender_id": conn_req_data.sender_id,
                "receiver_id": conn_req_data.receiver_id,
                "status": "failed",
                "error_code": 500,
                "detail": f"意外错误: {str(e)}"
            })
            failed_connections += 1
            
    logger.info(f"批量连接处理完成。成功: {successful_connections}, 失败: {failed_connections}.")
    return {
        "summary": {
            "total_requested": len(request.connections),
            "successful": successful_connections,
            "failed": failed_connections
        },
        "results": results
    }

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
        "dependencies": {
            "registry_service": {
                "url": REGISTRY_SERVICE_URL if REGISTRY_SERVICE_URL else "Not Configured",
                "status": registry_status
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    api_port = int(os.getenv("API_PORT", "8001"))
    log_level = os.getenv("LOG_LEVEL", "info").lower()
    logger.info(f"启动连接管理服务在端口 {api_port}，日志级别 {log_level}")
    logger.info(f"注册服务URL: {REGISTRY_SERVICE_URL}")
    uvicorn.run(app, host="0.0.0.0", port=api_port, log_level=log_level)

