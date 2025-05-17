# 安全配置文件，遵循AMWA BCP-003标准并实现基于角色的访问控制（RBAC）
import bcrypt
import json
import os

# AMWA BCP-003 安全配置
SECURITY_STANDARDS = {
    "AMWA_BCP_003": {
        "version": "1.0",
        "description": "AMWA BCP-003 安全最佳实践",
        "requirements": {
            "authentication": True,
            "authorization": True,
            "encryption": True,
            "audit_logging": True
        }
    }
}

# RBAC 角色定义
ROLES = {
    "admin": {
        "description": "管理员角色，拥有所有权限",
        "permissions": [
            "read:all",
            "write:all",
            "delete:all",
            "manage:users",
            "manage:roles",
            "manage:connections",
            "manage:devices",
            "manage:events",
            "manage:audio_mapping"
        ]
    },
    "operator": {
        "description": "操作员角色，可以管理连接和设备",
        "permissions": [
            "read:all",
            "write:connections",
            "write:devices",
            "manage:connections",
            "manage:devices"
        ]
    },
    "viewer": {
        "description": "查看者角色，只能查看信息",
        "permissions": [
            "read:all"
        ]
    }
}

# 用户和角色映射
# 示例：使用 bcrypt 哈希密码
# 在实际应用中，这些哈希值应该在用户创建时生成并安全存储
def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

USERS_FILE = "users.json"

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            try:
                users_data = json.load(f)
                # Convert password hashes from string (if stored as string) to bytes
                for user_data in users_data.values():
                    if 'password_hash' in user_data and isinstance(user_data['password_hash'], str):
                        user_data['password_hash'] = user_data['password_hash'].encode('utf-8')
                return users_data
            except json.JSONDecodeError:
                return {}
    return {}

def save_users(users_data):
    # Convert password hashes from bytes to string for JSON serialization
    serializable_users_data = {}
    for username, user_data in users_data.items():
        serializable_user_data = user_data.copy()
        if 'password_hash' in serializable_user_data and isinstance(serializable_user_data['password_hash'], bytes):
            serializable_user_data['password_hash'] = serializable_user_data['password_hash'].decode('utf-8')
        serializable_users_data[username] = serializable_user_data

    with open(USERS_FILE, 'w') as f:
        json.dump(serializable_users_data, f, indent=4)

# 用户和角色映射
# 示例：使用 bcrypt 哈希密码
# 在实际应用中，这些哈希值应该在用户创建时生成并安全存储
def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# Load users from file at startup
USERS = load_users()

# If no users exist in the file, initialize with default users and save
if not USERS:
    USERS = {
        "admin_user": {
            "username": "admin",
            "password_hash": hash_password("admin_password"),  # 示例密码 admin_password
            "role": "admin"
        },
        "operator_user": {
            "username": "operator",
            "password_hash": hash_password("operator_password"), # 示例密码 operator_password
            "role": "operator"
        },
        "viewer_user": {
            "username": "viewer",
            "password_hash": hash_password("viewer_password"),   # 示例密码 viewer_password
            "role": "viewer"
        }
    }
    save_users(USERS)

# 权限检查函数
def check_permission(username, permission):
    """
    检查用户是否具有特定权限
    """
    if username not in USERS:
        return False
    
    user_role = USERS[username]["role"]
    if user_role not in ROLES:
        return False
    
    return permission in ROLES[user_role]["permissions"]

# 密码验证函数
def verify_password(username, provided_password: str) -> bool:
    if username not in USERS:
        return False
    stored_hash = USERS[username].get("password_hash")
    if not stored_hash:
        return False
    return bcrypt.checkpw(provided_password.encode('utf-8'), stored_hash)

# 更新用户密码函数
def update_user_password(username, new_password: str) -> bool:
    if username not in USERS:
        return False
    USERS[username]["password_hash"] = hash_password(new_password)
    save_users(USERS)
    print(f"User {username}'s password updated and saved.") # 仅用于演示
    return True


# 安全审计日志配置
AUDIT_LOGGING = {
    "enabled": True,
    "log_file": "audit.log",
    "log_level": "INFO",
    "log_format": "%(asctime)s - %(levelname)s - %(message)s"
}

# 加密配置
ENCRYPTION = {
    "enabled": True,
    "algorithm": "AES-256-GCM",
    "key_management": "local",  # 可以是 'local', 'kms', 等
    "key_rotation_period": "90 days"
}

# TLS配置，符合AMWA BCP-003-01标准
TLS_CONFIG = {
    "enabled": True,
    "certificate_path": "/path/to/certificate.pem",
    "key_path": "/path/to/privatekey.pem",
    "cipher_suites": [
        "TLS_AES_256_GCM_SHA384",
        "TLS_AES_128_GCM_SHA256",
        "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
        "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
    ],
    "minimum_version": "TLSv1.2",
    "hsts_enabled": True,
    "hsts_max_age": 31536000  # 1年
}

# 渗透测试配置
# JWT认证配置
SECRET_KEY = "your-super-secret-key" # TODO: 在生产环境中，请使用更安全的密钥并从环境变量或安全存储中加载
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Token过期时间（分钟）

PENETRATION_TESTING = {
    "enabled": False,  # 默认为禁用，需手动启用
    "script_path": "security_tests/penetration_test.py",
    "schedule": "monthly",
    "report_path": "security_reports/penetration_test_report_{date}.json",
    "notification_emails": ["security@company.com"]
}