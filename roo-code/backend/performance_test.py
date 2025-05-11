import requests
import time
import threading
import random
import json
from datetime import datetime

# 性能测试脚本，用于模拟高负载情况下的系统性能

# 配置参数
API_ENDPOINT = "http://localhost:8001"
NUM_THREADS = 50
REQUESTS_PER_THREAD = 100
DELAY_BETWEEN_REQUESTS = 0.1  # 秒

# 测试结果存储
results = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "average_response_time": 0.0,
    "max_response_time": 0.0,
    "min_response_time": float('inf'),
    "start_time": None,
    "end_time": None
}

# 模拟请求的函数
def make_request(thread_id):
    thread_results = {
        "successful": 0,
        "failed": 0,
        "response_times": []
    }
    
    for i in range(REQUESTS_PER_THREAD):
        try:
            # 随机选择一个API端点进行测试
            endpoints = ["/connect", "/connection_status/", "/bulk_connect"]
            endpoint = random.choice(endpoints)
            url = f"{API_ENDPOINT}{endpoint}"
            
            start_time = time.time()
            if endpoint in ["/connect", "/bulk_connect"]:
                # 模拟连接请求数据
                if endpoint == "/connect":
                    data = {
                        "sender_id": f"sender_{random.randint(1, 100)}",
                        "receiver_id": f"receiver_{random.randint(1, 100)}",
                        "transport_params": {"param1": "value1"},
                        "activation_mode": random.choice(["activate_immediate", "activate_scheduled_absolute"]),
                        "activation_time": "2025-05-12T12:00:00Z" if random.random() > 0.5 else None
                    }
                    response = requests.post(url, json=data, timeout=5)
                else:  # bulk_connect
                    data = {
                        "connections": [
                            {
                                "sender_id": f"sender_{random.randint(1, 100)}",
                                "receiver_id": f"receiver_{random.randint(1, 100)}",
                                "transport_params": {"param1": "value1"},
                                "activation_mode": random.choice(["activate_immediate", "activate_scheduled_absolute"]),
                                "activation_time": "2025-05-12T12:00:00Z" if random.random() > 0.5 else None
                            } for _ in range(5)
                        ]
                    }
                    response = requests.post(url, json=data, timeout=5)
            else:
                response = requests.get(url + f"receiver_{random.randint(1, 100)}", timeout=5)
            end_time = time.time()
            
            response_time = end_time - start_time
            thread_results["response_times"].append(response_time)
            
            if response.status_code == 200:
                thread_results["successful"] += 1
            else:
                thread_results["failed"] += 1
        except Exception as e:
            print(f"线程 {thread_id} 请求 {i+1} 失败: {str(e)}")
            thread_results["failed"] += 1
            
        time.sleep(DELAY_BETWEEN_REQUESTS)
    
    return thread_results

# 线程工作函数
def worker(thread_id):
    print(f"线程 {thread_id} 开始测试...")
    thread_results = make_request(thread_id)
    print(f"线程 {thread_id} 完成测试.")
    
    # 更新全局结果
    global results
    results["total_requests"] += REQUESTS_PER_THREAD
    results["successful_requests"] += thread_results["successful"]
    results["failed_requests"] += thread_results["failed"]
    
    if thread_results["response_times"]:
        avg_time = sum(thread_results["response_times"]) / len(thread_results["response_times"])
        max_time = max(thread_results["response_times"])
        min_time = min(thread_results["response_times"])
        
        if results["average_response_time"] == 0:
            results["average_response_time"] = avg_time
        else:
            results["average_response_time"] = (results["average_response_time"] + avg_time) / 2
            
        results["max_response_time"] = max(results["max_response_time"], max_time)
        results["min_response_time"] = min(results["min_response_time"], min_time)

# 主函数
def main():
    print("开始性能测试...")
    results["start_time"] = datetime.now()
    
    threads = []
    for i in range(NUM_THREADS):
        t = threading.Thread(target=worker, args=(i,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    results["end_time"] = datetime.now()
    print("\n性能测试完成！")
    print("\n测试结果:")
    print(f"总请求数: {results['total_requests']}")
    print(f"成功请求数: {results['successful_requests']}")
    print(f"失败请求数: {results['failed_requests']}")
    print(f"平均响应时间: {results['average_response_time']:.3f} 秒")
    print(f"最大响应时间: {results['max_response_time']:.3f} 秒")
    print(f"最小响应时间: {results['min_response_time']:.3f} 秒")
    print(f"测试开始时间: {results['start_time']}")
    print(f"测试结束时间: {results['end_time']}")
    print(f"测试持续时间: {results['end_time'] - results['start_time']}")
    
    # 将结果保存到文件
    with open("performance_test_results.json", "w") as f:
        json.dump(results, f, default=str, indent=2)
    print("\n测试结果已保存到 performance_test_results.json")

if __name__ == "__main__":
    main()