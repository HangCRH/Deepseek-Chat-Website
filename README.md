# Deepseek Chat Website（DeepSeek 对话网页版）

> 一个与深度求索（DeepSeek）大语言模型对话的 Web 应用：原生网页前端 + FastAPI 后端。

## 语言
本项目只支持中文，界面与文档均为中文。

## 功能
- 与 DeepSeek 大语言模型进行对话
- 支持模型与思考模式切换：V4 Flash / V4 Pro，非深度思考 / 深度思考 high / max
- 前端无违禁词，免费使用

## 技术栈
- 前端：原生 HTML + JavaScript + CSS（Markdown 渲染：zero-md）
- 后端：Python + FastAPI，通过 OpenAI SDK 调用 DeepSeek 官方 API

## 项目结构
```
Deepseek-Chat-Website/
├── backend/
│   ├── main.py        # FastAPI 应用：聊天接口、模型列表、CORS 等
│   └── getai.py       # 模型列表与参数映射，调用 DeepSeek API
├── requirements.txt   # 后端依赖清单（pip install -r 一键安装）
└── frontend/
    ├── index.html     # 页面结构
    ├── main.js        # 页面逻辑、对话历史、FETCH_URL 配置
    ├── request.js     # 请求后端接口
    ├── style.css      # 样式
    ├── zero-md.js     # Markdown 渲染库
    └── pic/           # 图片资源
```

## 快速开始
### 后端
1. 安装依赖：`pip install -r requirements.txt`（依赖清单见项目根目录 `requirements.txt`，含 `fastapi[standard]`、`openai` 等）
2. 设置环境变量 `deepseekAPI` 为你的 DeepSeek API Key
3. 在 `backend/` 目录下启动：`uvicorn main:app --port 32767`

### 前端
直接用浏览器打开 `frontend/index.html`；后端地址可在 `frontend/main.js` 的 `FETCH_URL` 中修改。

## API 接口
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/ds/chat/` | 对话接口，请求体包含 model 与 messages |
| GET | `/ds/modellist/` | 获取可用模型列表 |
| GET | `/ds/` | 兼容旧版本的对话接口 |

## 隐私免责声明
> ⚠️ 你与模型对话的所有问题都不受保护，可能被读取。请勿在对话中发送敏感信息。

## 关于本仓库
本仓库最大的作用是版本控制和云端备份，其次是开源。本来就不是用来给其他人下载使用的，当然你用我一般也不会管太多。

frontend v1.2.0 和 backend v1.2.0 及更早版本发布时间与 release 发布时间不同。为什么？
因为这个项目很早就在做了，但当时我不会用 GitHub 和 Git，所以没有放在仓库里。
（当时我怎么做到的版本控制？答案就是每个版本都有一个文件夹，写新版本就复制出来一个新的）