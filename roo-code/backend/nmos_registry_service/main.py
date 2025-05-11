from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import websocket
import json
import threading
import asyncio
import logging

app = FastAPI(title="NMOS Registry Service (IS-04)")

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 内部缓存，用于存储NMOS资源
nmos_resources = {
    "nodes": [],
    "devices": [],
    "senders": [],
    "receivers": [],
    "sources": [],
    "flows": []
}

class RegistryConfig(BaseModel):
    registry_url: str

@app.post("/configure")
async def configure_registry(config: RegistryConfig):
    """配置NMOS注册中心URL"""
    global registry_url
    registry_url = config.registry_url
    logger.info(f"NMOS注册中心已配置为: {registry_url}")
    return {"message": "注册中心配置成功", "url": registry_url}

@app.get("/discover")
async def discover_resources():
    """通过查询API发现NMOS资源"""
    try:
        response = requests.get(f"{registry_url}/x-nmos/query/v1.3/resources")
        if response.status_code == 200:
            resources = response.json()
            update_resources(resources)
            return {"message": "资源发现成功", "resources": resources}
        else:
            raise HTTPException(status_code=response.status_code, detail="资源发现失败")
    except Exception as e:
        logger.error(f"资源发现错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"资源发现错误: {str(e)}")

def update_resources(resources):
    """更新内部资源缓存"""
    global nmos_resources
    for resource in resources:
        resource_type = resource.get("type")
        if resource_type == "node":
            nmos_resources["nodes"].append(resource)
        elif resource_type == "device":
            nmos_resources["devices"].append(resource)
        elif resource_type == "sender":
            nmos_resources["senders"].append(resource)
        elif resource_type == "receiver":
            nmos_resources["receivers"].append(resource)
        elif resource_type == "source":
            nmos_resources["sources"].append(resource)
        elif resource_type == "flow":
            nmos_resources["flows"].append(resource)
    logger.info("NMOS资源缓存已更新")

def on_message(ws, message):
    """处理WebSocket消息"""
    data = json.loads(message)
    logger.info(f"收到WebSocket更新: {data}")
    update_resources(data.get("resources", []))

def on_error(ws, error):
    """处理WebSocket错误"""
    logger.error(f"WebSocket错误: {error}")

def on_close(ws, close_status_code, close_msg):
    """处理WebSocket关闭"""
    logger.info("WebSocket连接已关闭")

def on_open(ws):
    """处理WebSocket打开"""
    logger.info("WebSocket连接已建立")

@app.on_event("startup")
async def startup_event():
    """在应用启动时建立WebSocket订阅"""
    if registry_url:
        ws_url = f"ws://{registry_url.split('://')[1]}/x-nmos/query/v1.3/subscriptions"
        ws = websocket.WebSocketApp(ws_url,
                                    on_open=on_open,
                                    on_message=on_message,
                                    on_error=on_error,
                                    on_close=on_close)
        threading.Thread(target=ws.run_forever, daemon=True).start()
        logger.info("WebSocket订阅线程已启动")

@app.get("/resources")
async def get_resources():
    """获取当前缓存的NMOS资源"""
    return nmos_resources

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)