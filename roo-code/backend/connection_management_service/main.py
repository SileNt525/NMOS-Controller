from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import requests
import json
import logging

app = FastAPI(title="NMOS Connection Management Service (IS-05)")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 假设NMOS注册服务的地址
REGISTRY_SERVICE_URL = "http://localhost:8000"

class ConnectionRequest(BaseModel):
    sender_id: str
    receiver_id: str
    transport_params: dict
    activation_mode: str = "activate_immediate"
    activation_time: str = None  # 用于延迟激活的时间戳

@app.post("/connect")
async def connect(request: ConnectionRequest):
    """发起连接请求"""
    try:
        # 从注册服务获取Sender和Receiver信息
        sender_response = requests.get(f"{REGISTRY_SERVICE_URL}/resources")
        if sender_response.status_code != 200:
            raise HTTPException(status_code=404, detail="无法获取Sender信息")
        
        resources = sender_response.json()
        sender = next((s for s in resources["senders"] if s["id"] == request.sender_id), None)
        receiver = next((r for r in resources["receivers"] if r["id"] == request.receiver_id), None)
        
        if not sender or not receiver:
            raise HTTPException(status_code=404, detail="Sender或Receiver未找到")
        
        # 构建IS-05 PATCH请求
        patch_data = {
            "transport_params": request.transport_params,
            "activation": {"mode": request.activation_mode}
        }
        if request.activation_time and request.activation_mode == "activate_scheduled_absolute":
            patch_data["activation"]["requested_time"] = request.activation_time
        
        # 向Receiver发送PATCH请求
        receiver_href = receiver.get("href", "")
        if not receiver_href:
            raise HTTPException(status_code=400, detail="Receiver href不可用")
        
        patch_response = requests.patch(f"{receiver_href}/single/receivers/{request.receiver_id}/active", json=patch_data)
        if patch_response.status_code == 200:
            logger.info(f"连接成功: Sender {request.sender_id} 到 Receiver {request.receiver_id}")
            return {"message": "连接成功", "details": patch_response.json()}
        else:
            raise HTTPException(status_code=patch_response.status_code, detail="连接失败")
    except Exception as e:
        logger.error(f"连接错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"连接错误: {str(e)}")

@app.get("/connection_status/{resource_id}")
async def get_connection_status(resource_id: str):
    """获取连接状态"""
    try:
        response = requests.get(f"{REGISTRY_SERVICE_URL}/resources")
        if response.status_code == 200:
            resources = response.json()
            receiver = next((r for r in resources["receivers"] if r["id"] == resource_id), None)
            if receiver:
                return {"status": "connected", "details": receiver}
            else:
                raise HTTPException(status_code=404, detail="Receiver未找到")
        else:
            raise HTTPException(status_code=response.status_code, detail="无法获取连接状态")
    except Exception as e:
        logger.error(f"获取连接状态错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"获取连接状态错误: {str(e)}")

class BulkConnectionRequest(BaseModel):
    connections: list[ConnectionRequest]

@app.post("/bulk_connect")
async def bulk_connect(request: BulkConnectionRequest):
    """发起批量连接请求"""
    results = []
    for conn in request.connections:
        try:
            # 从注册服务获取Sender和Receiver信息
            sender_response = requests.get(f"{REGISTRY_SERVICE_URL}/resources")
            if sender_response.status_code != 200:
                results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "failed", "detail": "无法获取Sender信息"})
                continue
            
            resources = sender_response.json()
            sender = next((s for s in resources["senders"] if s["id"] == conn.sender_id), None)
            receiver = next((r for r in resources["receivers"] if r["id"] == conn.receiver_id), None)
            
            if not sender or not receiver:
                results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "failed", "detail": "Sender或Receiver未找到"})
                continue
            
            # 构建IS-05 PATCH请求
            patch_data = {
                "transport_params": conn.transport_params,
                "activation": {"mode": conn.activation_mode}
            }
            if conn.activation_time and conn.activation_mode == "activate_scheduled_absolute":
                patch_data["activation"]["requested_time"] = conn.activation_time
            
            # 向Receiver发送PATCH请求
            receiver_href = receiver.get("href", "")
            if not receiver_href:
                results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "failed", "detail": "Receiver href不可用"})
                continue
            
            patch_response = requests.patch(f"{receiver_href}/single/receivers/{conn.receiver_id}/active", json=patch_data)
            if patch_response.status_code == 200:
                logger.info(f"批量连接成功: Sender {conn.sender_id} 到 Receiver {conn.receiver_id}")
                results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "success", "details": patch_response.json()})
            else:
                results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "failed", "detail": "连接失败"})
        except Exception as e:
            logger.error(f"批量连接错误: {str(e)}")
            results.append({"sender_id": conn.sender_id, "receiver_id": conn.receiver_id, "status": "failed", "detail": str(e)})
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)