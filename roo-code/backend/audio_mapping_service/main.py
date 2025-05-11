"""
Roo Code - 音频映射服务 (IS-08)
此服务负责处理NMOS IS-08音频通道映射功能，包括通道静音、交换和重新路由等操作。
"""

import logging
import json
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Roo Code - 音频映射服务 (IS-08)")

# 假设的NMOS注册服务地址，用于获取设备信息
NMOS_REGISTRY_URL = "http://localhost:5001/nmos/registry"

class AudioMappingRequest(BaseModel):
    device_id: str
    operation: str
    params: Dict[str, Any] = {}

@app.get("/audio_mapping")
async def get_audio_mapping():
    """
    获取当前音频通道映射状态
    """
    try:
        # 从NMOS注册服务获取支持IS-08的设备列表
        response = requests.get(f"{NMOS_REGISTRY_URL}/devices", timeout=5)
        if response.status_code == 200:
            devices = response.json()
            is08_devices = [d for d in devices if "IS-08" in d.get("capabilities", [])]
            return {"status": "success", "devices": is08_devices}
        else:
            return JSONResponse(status_code=500, content={"status": "error", "message": "无法获取设备列表"})
    except Exception as e:
        logger.error(f"获取音频映射状态时出错: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

@app.post("/audio_mapping")
async def perform_audio_mapping(request: AudioMappingRequest):
    """
    执行音频通道映射操作
    支持的操作包括：mute（静音）、swap（交换）、reroute（重新路由）
    """
    try:
        device_id = request.device_id
        operation = request.operation
        params = request.params

        if not device_id or not operation:
            raise HTTPException(status_code=400, detail={"status": "error", "message": "缺少必要的参数"})

        # 构建IS-08命令URL
        command_url = f"http://{device_id}/is-08/command"
        payload = {
            "operation": operation,
            "params": params
        }

        # 发送命令到设备
        response = requests.post(command_url, json=payload, timeout=5)
        if response.status_code == 200:
            return {"status": "success", "result": response.json()}
        else:
            return JSONResponse(status_code=response.status_code, content={"status": "error", "message": response.text})
    except Exception as e:
        logger.error(f"执行音频映射操作时出错: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})

if __name__ == '__main__':
    import uvicorn
    logger.info("启动音频映射服务...")
    uvicorn.run(app, host="0.0.0.0", port=5004)