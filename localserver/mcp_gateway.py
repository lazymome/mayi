#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tapnow 本地 MCP 工具网关。"""

import base64
import json
import os
from datetime import datetime

MANIFEST_FILENAME = "mcp_manifest.json"
DEFAULT_AUDIT_LOG = ".tapnow_mcp_audit.log"
LOW_RISK_LEVELS = {"low", "readonly", "read_only"}


class MCPError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _server_dir():
    return os.path.dirname(os.path.abspath(__file__))


def _manifest_path():
    return os.path.join(_server_dir(), MANIFEST_FILENAME)


def load_manifest():
    with open(_manifest_path(), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def get_mcp_config(config):
    value = config.get("mcp") if isinstance(config, dict) else None
    if not isinstance(value, dict):
        value = {}
    return {
        "enabled": bool(value.get("enabled", False)),
        "auth_token": value.get("auth_token", ""),
        "allowed_origins": value.get("allowed_origins", ["http://127.0.0.1", "http://localhost"]),
        "allowed_tools": value.get("allowed_tools", []),
        "audit_log": value.get("audit_log", os.path.join(_server_dir(), DEFAULT_AUDIT_LOG)),
    }


def _auth_token(config):
    env_token = os.environ.get("TAPNOW_MCP_AUTH_TOKEN", "")
    if env_token:
        return env_token
    return str(get_mcp_config(config).get("auth_token") or "")


def auth_required(config):
    return bool(_auth_token(config))


def _header_value(headers, name):
    try:
        return headers.get(name)
    except Exception:
        return None


def check_call_auth(config, headers):
    expected = _auth_token(config)
    if not expected:
        return True
    auth = _header_value(headers, "Authorization") or ""
    token = _header_value(headers, "X-Tapnow-MCP-Token") or ""
    if auth.startswith("Bearer ") and auth[7:].strip() == expected:
        return True
    if token == expected:
        return True
    raise MCPError("MCP token required or invalid", 401)


def _tool_entries(manifest):
    tools = manifest.get("tools", []) if isinstance(manifest, dict) else []
    return [item for item in tools if isinstance(item, dict) and item.get("name")]


def _is_tool_allowed(tool, mcp_config):
    allowed_tools = mcp_config.get("allowed_tools") or []
    if "*" in allowed_tools or tool.get("name") in allowed_tools:
        return True
    risk = str(tool.get("risk", "")).lower()
    return bool(tool.get("default_enabled")) and risk in LOW_RISK_LEVELS


def visible_tools(config, manifest=None):
    manifest = manifest or load_manifest()
    mcp_config = get_mcp_config(config)
    result = []
    for tool in _tool_entries(manifest):
        if not _is_tool_allowed(tool, mcp_config):
            continue
        result.append({
            "name": tool.get("name"),
            "description": tool.get("description", ""),
            "risk": tool.get("risk", "low"),
            "input_schema": tool.get("input_schema", {"type": "object"}),
        })
    return result


def status(config, features, manifest=None):
    manifest = manifest or load_manifest()
    mcp_config = get_mcp_config(config)
    enabled_tools = [tool["name"] for tool in visible_tools(config, manifest)]
    return {
        "enabled": bool(mcp_config.get("enabled")),
        "auth_required": auth_required(config),
        "tools_count": len(enabled_tools),
        "enabled_tools": enabled_tools,
        "features": features,
    }


def _validate_type(name, value, expected_type):
    if expected_type == "string" and not isinstance(value, str):
        raise MCPError("参数 %s 必须是字符串" % name)
    if expected_type == "integer" and not isinstance(value, int):
        raise MCPError("参数 %s 必须是整数" % name)
    if expected_type == "boolean" and not isinstance(value, bool):
        raise MCPError("参数 %s 必须是布尔值" % name)
    if expected_type == "object" and not isinstance(value, dict):
        raise MCPError("参数 %s 必须是对象" % name)
    if expected_type == "array" and not isinstance(value, list):
        raise MCPError("参数 %s 必须是数组" % name)


def validate_arguments(tool, arguments):
    schema = tool.get("input_schema") or {"type": "object"}
    if not isinstance(arguments, dict):
        raise MCPError("arguments 必须是对象")
    required = schema.get("required", [])
    properties = schema.get("properties", {})
    for key in required:
        if key not in arguments:
            raise MCPError("缺少必填参数: %s" % key)
    for key, value in arguments.items():
        prop = properties.get(key)
        if not isinstance(prop, dict):
            continue
        expected_type = prop.get("type")
        if expected_type:
            _validate_type(key, value, expected_type)
        if "enum" in prop and value not in prop["enum"]:
            raise MCPError("参数 %s 不在允许值内" % key)
        if isinstance(value, int):
            if "minimum" in prop and value < prop["minimum"]:
                raise MCPError("参数 %s 小于最小值" % key)
            if "maximum" in prop and value > prop["maximum"]:
                raise MCPError("参数 %s 超过最大值" % key)
    return arguments


def audit(config, tool_name, ok, error=None):
    mcp_config = get_mcp_config(config)
    path = mcp_config.get("audit_log") or os.path.join(_server_dir(), DEFAULT_AUDIT_LOG)
    if not os.path.isabs(path):
        path = os.path.join(_server_dir(), path)
    record = {
        "time": datetime.utcnow().isoformat() + "Z",
        "tool": tool_name,
        "ok": bool(ok),
    }
    if error:
        record["error"] = str(error)[:500]
    try:
        parent = os.path.dirname(path)
        if parent and not os.path.exists(parent):
            os.makedirs(parent)
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _limited_int(value, default, minimum, maximum):
    try:
        value = int(value)
    except Exception:
        value = default
    return max(minimum, min(maximum, value))


def _tool_ping(arguments, context):
    return {"message": "pong", "time": datetime.utcnow().isoformat() + "Z"}


def _tool_proxy_status(arguments, context):
    config = context["config"]
    return {
        "enabled": bool(context["features"].get("proxy_server", True)),
        "allowed_hosts_count": len(config.get("proxy_allowed_hosts", []) or []),
        "timeout": config.get("proxy_timeout"),
        "safe_forwarding": "not_exposed_via_mcp",
    }


def _tool_list_files(arguments, context):
    config = context["config"]
    base_path = config["save_path"]
    limit = _limited_int(arguments.get("limit", 100), 100, 1, 500)
    offset = _limited_int(arguments.get("offset", 0), 0, 0, 1000000)
    files = []
    scanned = 0
    if not os.path.exists(base_path):
        return {"files": [], "base_path": base_path, "limit": limit, "offset": offset, "has_more": False}
    is_image_file = context["helpers"]["is_image_file"]
    is_video_file = context["helpers"]["is_video_file"]
    for root, dirs, filenames in os.walk(base_path):
        for filename in filenames:
            if not (is_image_file(filename) or is_video_file(filename)):
                continue
            filepath = os.path.join(root, filename)
            if scanned < offset:
                scanned += 1
                continue
            if len(files) >= limit:
                return {
                    "files": files,
                    "base_path": base_path.replace('\\', '/'),
                    "limit": limit,
                    "offset": offset,
                    "has_more": True,
                }
            rel_path = os.path.relpath(filepath, base_path)
            try:
                size = os.path.getsize(filepath)
                mtime = os.path.getmtime(filepath)
            except Exception:
                size = 0
                mtime = 0
            files.append({
                "filename": filename,
                "path": filepath.replace('\\', '/'),
                "rel_path": rel_path.replace('\\', '/'),
                "size": size,
                "mtime": mtime,
            })
            scanned += 1
    return {
        "files": files,
        "base_path": base_path.replace('\\', '/'),
        "limit": limit,
        "offset": offset,
        "has_more": False,
    }


def _tool_save_cache(arguments, context):
    config = context["config"]
    helpers = context["helpers"]
    item_id = arguments.get("id", "")
    content = arguments.get("content", "")
    category = arguments.get("category", "characters")
    filename_ext = arguments.get("ext", ".jpg")
    file_type = arguments.get("type", "image")
    custom_path = arguments.get("custom_path", "")
    if not item_id or not content:
        raise MCPError("缺少ID或内容")
    if not isinstance(category, str) or ".." in category.replace('\\', '/'):
        raise MCPError("非法分类")
    if not isinstance(filename_ext, str) or not filename_ext.startswith(".") or len(filename_ext) > 16:
        raise MCPError("非法扩展名")
    if custom_path:
        cache_dir = os.path.expanduser(custom_path)
        if not os.path.isabs(cache_dir):
            cache_dir = helpers["safe_join"](config["save_path"], cache_dir)
            if not cache_dir:
                raise MCPError("非法路径")
        else:
            cache_dir = os.path.abspath(cache_dir)
        if not helpers["is_path_allowed"](cache_dir):
            raise MCPError("不允许保存到该路径", 403)
        base_root = config["save_path"]
    elif file_type == "video" and config.get("video_save_path"):
        base_root = config["video_save_path"]
        cache_dir = os.path.join(base_root, category)
    elif file_type == "image" and config.get("image_save_path"):
        base_root = config["image_save_path"]
        cache_dir = os.path.join(base_root, category)
    else:
        base_root = config["save_path"]
        cache_dir = os.path.join(base_root, ".tapnow_cache", category)
    helpers["ensure_dir"](cache_dir)
    if "," in content:
        content = content.split(",", 1)[1]
    try:
        file_data = base64.b64decode(content)
    except Exception:
        raise MCPError("content 不是有效 base64")
    converted = False
    if file_type == "image" and config.get("convert_png_to_jpg") and filename_ext.lower() == ".png":
        file_data, converted = helpers["convert_png_to_jpg"](file_data, config.get("jpg_quality", 95))
        if converted:
            filename_ext = ".jpg"
    filename = "%s%s" % (item_id, filename_ext)
    filepath = os.path.join(cache_dir, filename)
    with open(filepath, "wb") as f:
        f.write(file_data)
    try:
        rel_path = os.path.relpath(filepath, base_root).replace('\\', '/')
    except ValueError:
        rel_path = os.path.relpath(filepath, cache_dir).replace('\\', '/')
        rel_path = ".tapnow_cache/%s/%s" % (category, rel_path) if base_root == config["save_path"] else "%s/%s" % (category, rel_path)
    if rel_path.startswith(".."):
        rel_path = os.path.relpath(filepath, cache_dir).replace('\\', '/')
        rel_path = ".tapnow_cache/%s/%s" % (category, rel_path) if base_root == config["save_path"] else "%s/%s" % (category, rel_path)
    local_url = "http://127.0.0.1:%s/file/%s" % (config["port"], rel_path)
    return {
        "path": filepath,
        "url": local_url,
        "rel_path": rel_path,
        "converted": converted,
        "size": len(file_data),
    }


def _tool_comfy_apps(arguments, context):
    if not context["features"].get("comfy_middleware"):
        raise MCPError("ComfyUI middleware is disabled", 503)
    workflows_dir = context["workflows_dir"]
    apps = []
    if os.path.exists(workflows_dir):
        apps = [d for d in os.listdir(workflows_dir) if os.path.isdir(os.path.join(workflows_dir, d))]
    return {"apps": apps, "workflows_dir": workflows_dir}


def _tool_comfy_status(arguments, context):
    if not context["features"].get("comfy_middleware"):
        raise MCPError("ComfyUI middleware is disabled", 503)
    job_id = arguments.get("job_id") or arguments.get("request_id") or arguments.get("task_id")
    if job_id:
        resolver = context.get("resolve_job_by_request_id")
        job = resolver(job_id) if resolver else None
        if not job:
            raise MCPError("Job not found", 404)
        return job
    job_status = context.get("job_status", {})
    lock = context.get("status_lock")
    if lock:
        with lock:
            counts = _count_job_status(job_status)
    else:
        counts = _count_job_status(job_status)
    return {"enabled": True, "jobs": counts}


def _count_job_status(job_status):
    counts = {}
    for job in job_status.values():
        state = job.get("status", "unknown") if isinstance(job, dict) else "unknown"
        counts[state] = counts.get(state, 0) + 1
    return counts


TOOL_EXECUTORS = {
    "ping": _tool_ping,
    "list_files": _tool_list_files,
    "save_cache": _tool_save_cache,
    "proxy_status": _tool_proxy_status,
    "comfy_apps": _tool_comfy_apps,
    "comfy_status": _tool_comfy_status,
}


def call_tool(payload, headers, context):
    config = context["config"]
    mcp_config = get_mcp_config(config)
    if not mcp_config.get("enabled"):
        return {"success": False, "ok": False, "tool": None, "error": "MCP gateway disabled"}, 403
    check_call_auth(config, headers)
    if not isinstance(payload, dict):
        raise MCPError("请求体必须是 JSON 对象")
    name = payload.get("name") or payload.get("tool")
    arguments = payload.get("arguments")
    if arguments is None:
        arguments = payload.get("args", {})
    if not name:
        raise MCPError("缺少工具名")
    manifest = load_manifest()
    tools = {tool["name"]: tool for tool in _tool_entries(manifest)}
    tool = tools.get(name)
    if not tool:
        raise MCPError("未知工具: %s" % name, 404)
    if not _is_tool_allowed(tool, mcp_config):
        raise MCPError("工具未启用或不在 allowlist: %s" % name, 403)
    arguments = validate_arguments(tool, arguments or {})
    executor = TOOL_EXECUTORS.get(name)
    if not executor:
        raise MCPError("工具未实现: %s" % name, 501)
    try:
        result = executor(arguments, context)
        audit(config, name, True)
        return {"success": True, "ok": True, "tool": name, "result": result}, 200
    except MCPError as exc:
        audit(config, name, False, exc)
        return {"success": False, "ok": False, "tool": name, "error": str(exc)}, exc.status
    except Exception as exc:
        audit(config, name, False, exc)
        return {"success": False, "ok": False, "tool": name, "error": str(exc)}, 500
