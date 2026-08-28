# DeepSeek Chat Website 后端 API 文档

> 本文档描述后端提供的 HTTP 接口，供所有前端版本（含历史版本）依此对接。
> **兼容承诺**：后端支持前端 **v1.2.0 及以上**（依据已发布 release 的"客户端要求"声明）。
> **目标契约说明**：文档中标记为"目标"的接口（如 `/ds/` 恢复 POST）代表修复后的行为；当前代码若与文档不一致，以本文档为准进行修复。

---

## 1. 基础信息

| 项目 | 值 |
| --- | --- |
| 服务地址 | `http://<主机>:32767/`（前端通过 `FETCH_URL` 配置） |
| 协议 | HTTP/1.1，UTF-8，JSON |
| 跨域 | CORS 已开启（`*` 或配置的来源列表） |
| 认证 | 无需（API Key 只在后端环境变量 `deepseekAPI` 中） |
| 响应格式 | 聊天接口为 **OpenAI 兼容格式**（所有版本前端共同依赖） |

---

## 2. 端点总览

| 方法 | 路径 | 状态 | 说明 | 使用方 |
| --- | --- | --- | --- | --- |
| GET | `/ds/modellist/` | 正式 | 获取可用模型列表 | 前端 v1.3.0+ |
| POST | `/ds/chat/` | 正式 | 对话（非流式，默认路径） | 前端 v1.3.0+ |
| POST | `/ds/` | 兼容（目标：恢复 POST） | 兼容旧版的对话接口 | 前端 v1.2.0 |
| GET | `/ds/version/` | 规划 | 版本与能力协商 | 未来前端（可选） |
| POST | `/ds/chat/`（`stream` 参数） | 试验性（规划） | 流式对话，默认关闭 | 未来前端 |

---

## 3. 通用约定

### 3.1 消息格式

```json
{ "role": "user", "content": "你好" }
{ "role": "assistant", "content": "你好！有什么可以帮你？" }
```

- `role`：`user` 或 `assistant`。
- `content`：消息正文，与 OpenAI 一致。
- 思考过程（`reasoning_content`）**不放入**发送给后端的 `messages`，只随响应返回。

### 3.2 模型标识

- 前端通过 `/ds/modellist/` 获取 `name`（对外稳定标识），请求时原样传回。
- 后端将 `name` 映射为实际 API 模型名与参数（见第 5 节）。
- 前端 v1.2.0 不使用列表，直接发送旧模型名 `deepseek-chat` / `deepseek-reasoner`，由后端别名映射。

### 3.3 响应格式（聊天接口）

所有聊天接口返回 OpenAI 兼容结构，关键字段：

| 字段 | 说明 |
| --- | --- |
| `choices[0].message.content` | AI 回答正文（**恒存在，旧前端依赖**） |
| `choices[0].message.reasoning_content` | 思考过程（仅深度思考模式存在） |
| `error` | 错误时存在，为字符串（**所有版本前端都检查此字段**） |

---

## 4. 详细接口

### 4.1 获取模型列表

```
GET /ds/modellist/
```

**请求**：无参数。

**响应**：**纯数组**（不可包装成对象，旧前端直接遍历）：

```json
[
  { "name": "deepseek-v4-flash-chat", "display_name": "DeepSeek V4 Flash 非深度思考" },
  { "name": "deepseek-v4-flash-high", "display_name": "DeepSeek V4 Flash 深度思考-high" },
  { "name": "deepseek-v4-flash-max", "display_name": "DeepSeek V4 Flash 深度思考-max" },
  { "name": "deepseek-v4-pro-chat",   "display_name": "DeepSeek V4 Pro 非深度思考" },
  { "name": "deepseek-v4-pro-high",   "display_name": "DeepSeek V4 Pro 深度思考-high" },
  { "name": "deepseek-v4-pro-max",    "display_name": "DeepSeek V4 Pro 深度思考-max" }
]
```

**约束**：列表中的每个 `name` 必须可被 `/ds/chat/` 解析；`name` 长期稳定，仅 `display_name` 可随官方命名调整。

---

### 4.2 对话（正式）

```
POST /ds/chat/
Content-Type: application/json
```

**请求体**：

```json
{
  "model": "deepseek-v4-flash-high",
  "messages": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好！有什么可以帮你？" },
    { "role": "user", "content": "用一句话介绍你自己" }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `model` | 是 | 模型列表中的 `name` |
| `messages` | 是 | 含当前问题在内的完整上下文，非空数组 |
| `stream` | 否 | 未来试验性：是否流式（默认 `false`；当前忽略） |

**成功响应**（OpenAI 兼容）：

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "我是 DeepSeek，一个由深度求索开发的大语言模型。",
        "reasoning_content": "用户想让我做自我介绍……"
      },
      "finish_reason": "stop"
    }
  ],
  "model": "deepseek-v4-flash",
  "usage": { "prompt_tokens": 12, "completion_tokens": 30, "total_tokens": 42 }
}
```

**失败响应**：

```json
{ "error": "Model and messages are required." }
```

> 注：`reasoning_content` 仅深度思考模式返回；非思考模式不返回该字段。前端需兼容"有/无"两种情况。

---

### 4.3 对话（兼容 v1.2.0）

```
POST /ds/
Content-Type: application/json
```

**当前缺陷**：代码中该端点被误写为 `GET /ds/`，而 v1.2.0 前端发送的是 POST，导致 405。**目标：恢复为 POST**（与 v1.2.0 时代一致）。修复后行为如下：

**请求体**：

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "你好" },
    { "role": "assistant", "content": "你好！有什么可以帮你？" },
    { "role": "user", "content": "继续" }
  ]
}
```

| `model` 取值 | 映射到 |
| --- | --- |
| `deepseek-chat` | `deepseek-v4-flash-chat`（V4 Flash 非深度思考） |
| `deepseek-reasoner` | `deepseek-v4-flash-high`（V4 Flash 深度思考-high） |

**响应**：与 `/ds/chat/` 完全一致（OpenAI 兼容格式）。

**约束**：此端点的存在是对 v1.2.0 的承诺；删除它属于破坏性变更，需按废弃流程处理。

---

### 4.4 版本与能力（规划）

```
GET /ds/version/
```

**可选请求头**：`X-DS-Client-Version: 1.6.0`（前端版本号）。

后端使用该版本号的目的**仅限于**：日志统计、对过旧版本返回"建议升级"提示、对已知问题版本启用最保守行为。**版本号只是输入信息，不是决策依据**（决策依据是下面的 `features`）；缺失时按最低兼容处理，绝不拒绝请求。

**响应**：

```json
{
  "backend_version": "1.3.2",
  "api_version": 1,
  "features": {
    "error_codes": true,
    "retry": true,
    "stream_experimental": false
  },
  "model_list_version": 1
}
```

**规则**：

- 未声明 / 未拿到能力 = 按最低兼容行为（非流式）。旧前端不调用此接口，完全无影响。
- `api_version` 采用**路线 B**：冻结在 1.0 后只增不改；破坏性变更（如删除端点）先标记废弃、积攒，随下次 MAJOR（2.0.0）合并发布，不会每删一个升一次。

---

### 4.5 流式对话（试验性，规划）

- 触发：请求体 `stream: true` **且** 后端开关开启（环境变量/配置）；默认关闭。
- 定位：**测试功能**，不参与兼容性承诺；关闭时即使请求 `stream: true` 也按非流式处理。
- 传输方式：**SSE / WebSocket 未定**（设计上事件流与传输解耦，倾向先 SSE）。
- 事件类型：`content`（增量正文）、`reasoning`（增量思考）、`done`（结束）、`error`（失败）。
- 验证点：流式拼接结果必须与非流式一致。

---

## 5. 模型与参数映射

| 前端标识（`name`） | 展示名 | 实际 API 模型 | thinking | reasoning_effort |
| --- | --- | --- | --- | --- |
| `deepseek-v4-flash-chat` | DeepSeek V4 Flash 非深度思考 | `deepseek-v4-flash` | disabled | — |
| `deepseek-v4-flash-high` | DeepSeek V4 Flash 深度思考-high | `deepseek-v4-flash` | enabled | high |
| `deepseek-v4-flash-max` | DeepSeek V4 Flash 深度思考-max | `deepseek-v4-flash` | enabled | max |
| `deepseek-v4-pro-chat` | DeepSeek V4 Pro 非深度思考 | `deepseek-v4-pro` | disabled | — |
| `deepseek-v4-pro-high` | DeepSeek V4 Pro 深度思考-high | `deepseek-v4-pro` | enabled | high |
| `deepseek-v4-pro-max` | DeepSeek V4 Pro 深度思考-max | `deepseek-v4-pro` | enabled | max |

**别名（仅 `/ds/` 使用）**：

| 旧名 | 别名目标 |
| --- | --- |
| `deepseek-chat` | `deepseek-v4-flash-chat` |
| `deepseek-reasoner` | `deepseek-v4-flash-high` |

**规则**：官方模型名/参数变化只修改本映射表，前端无感；未知模型名返回错误 `MODEL_NOT_FOUND`（不得出现 500）。

---

## 6. 错误说明

聊天接口出错时返回顶层 `error` 字符串（旧前端仅凭此判断成功与否）；附加字段供新前端精确处理：

```json
{
  "error": "Rate limit exceeded. Please retry later.",
  "code": "RATE_LIMITED",
  "retryable": true,
  "retry_after": 12
}
```

| code | HTTP | 场景 | 可重试 |
| --- | --- | --- | --- |
| `INVALID_REQUEST` | 400 | 缺少 model / messages | 否 |
| `MODEL_NOT_FOUND` | 400 | 未知模型名 | 否 |
| `AUTH_FAILED` | 401 | API Key 无效 | 否 |
| `RATE_LIMITED` | 429 | 上游限流 | 是（尊重 retry_after） |
| `UPSTREAM_ERROR` | 502 | 上游 5xx / 不可用 | 是 |
| `TIMEOUT` | 504 | 连接/读取超时 | 是 |
| `INTERNAL` | 500 | 未预期异常 | 否 |

> 注：`code` / `retryable` / `retry_after` 为规划字段，实现前旧前端仅依赖 `error` 字符串。

---

## 7. 兼容性与版本

| 前端版本 | `POST /ds/` | `POST /ds/chat/` | `GET /ds/modellist/` | 流式 |
| --- | --- | --- | --- | --- |
| v1.2.0 | ✅（恢复 POST 后） | — | — | — |
| v1.3.0 ~ v1.6.0 | — | ✅ | ✅ | — |
| v1.0.0 / v1.1.x | ❌（路径式接口，已放弃） | ❌ | ❌ | — |
| 未来前端 | — | ✅（默认非流式） | ✅ | ⚠️ 测试功能 |

**规则**：接口"只增不改"；删除承诺范围内接口 = 破坏性变更（需公告 → 升 `api_version`）；`/ds/` 的 POST 属已承诺能力，当前 GET 为 bug，将修复。

---

## 8. 变更记录

| 日期 | 内容 |
| --- | --- |
| 2026-08-28 | 创建文档；确认 `/ds/` 恢复 POST（兼容 v1.2.0）；记录模型映射表与错误码规划 |
