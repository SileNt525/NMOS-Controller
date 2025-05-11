# 安全配置文件，遵循AMWA BCP-003标准并实现基于角色的访问控制（RBAC）

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
USERS = {
    "admin_user": {
        "username": "admin",
        "password_hash": "hashed_password_here",  # 实际应用中应使用安全的哈希算法
        "role": "admin"
    },
    "operator_user": {
        "username": "operator",
        "password_hash": "hashed_password_here",
        "role": "operator"
    },
    "viewer_user": {
        "username": "viewer",
        "password_hash": "hashed_password_here",
        "role": "viewer"
    }
}

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
PENETRATION_TESTING = {
    "enabled": False,  # 默认为禁用，需手动启用
    "script_path": "security_tests/penetration_test.py",
    "schedule": "monthly",
    "report_path": "security_reports/penetration_test_report_{date}.json",
    "notification_emails": ["security@company.com"]
}