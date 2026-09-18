import os

from openai import AsyncOpenAI

# 返回给前端的模型列表，前端会根据这个列表展示可选的模型选项和对应模型名，后端需映射成参数
model_list = [
    {
        "name": "deepseek-v4.1-flash-chat",
        "display_name": "DeepSeek V4.1 Flash 非深度思考",
    },
    {
        "name": "deepseek-v4.1-flash-low",
        "display_name": "DeepSeek V4.1 Flash 深度思考-low",
    },
    {
        "name": "deepseek-v4.1-flash-high",
        "display_name": "DeepSeek V4.1 Flash 深度思考-high",
    },
    {
        "name": "deepseek-v4.1-flash-max",
        "display_name": "DeepSeek V4.1 Flash 深度思考-max",
    },
    {"name": "deepseek-v4-pro-chat", "display_name": "DeepSeek V4 Pro 非深度思考"},
    {"name": "deepseek-v4-pro-low", "display_name": "DeepSeek V4 Pro 深度思考-low"},
    {"name": "deepseek-v4-pro-high", "display_name": "DeepSeek V4 Pro 深度思考-high"},
    {"name": "deepseek-v4-pro-max", "display_name": "DeepSeek V4 Pro 深度思考-max"},
]

# 用于将前端模型名映射为请求参数
model_name_to_param = {
    "deepseek-v4.1-flash-chat": {
        "model": "deepseek-flash",
        "extra_body": {"thinking": {"type": "disabled"}},
        "reasoning_effort": "none",
    },
    "deepseek-v4.1-flash-low": {
        "model": "deepseek-flash",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "low",
    },
    "deepseek-v4.1-flash-high": {
        "model": "deepseek-flash",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "high",
    },
    "deepseek-v4.1-flash-max": {
        "model": "deepseek-flash",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "max",
    },
    "deepseek-v4-pro-chat": {
        "model": "deepseek-v4-pro",
        "extra_body": {"thinking": {"type": "disabled"}},
        "reasoning_effort": "none",
    },
    "deepseek-v4-pro-low": {
        "model": "deepseek-v4-pro",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "low",
    },
    "deepseek-v4-pro-high": {
        "model": "deepseek-v4-pro",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "high",
    },
    "deepseek-v4-pro-max": {
        "model": "deepseek-v4-pro",
        "extra_body": {"thinking": {"type": "enabled"}},
        "reasoning_effort": "max",
    },
}

client_normal = AsyncOpenAI(
    api_key=os.getenv("deepseekAPI"), base_url="https://api.deepseek.com/"
)


async def get_response(use_model, user_message):
    if use_model in model_name_to_param:  # 模型名存在
        param = model_name_to_param[use_model]  # 根据模型名获取请求参数
        if param["extra_body"]["thinking"]["type"] not in ("enabled", "disabled"):
            return {"error": "Invalid thinking parameter"}
        try:
            # 思考模式与非思考模式共用同一次调用：
            # 思考模型传 low/high/max，非思考模型传 none（与其 thinking 关闭状态一致）
            response = await client_normal.chat.completions.create(
                model=param["model"],
                messages=user_message,  # 由于在客户端已经将用户输入和上下文合并成一个列表，所以这里直接传递这个列表即可
                extra_body=param["extra_body"],
                reasoning_effort=param["reasoning_effort"],
                stream=False,
            )
        except Exception as e:
            print(f"Error in get_response: {e}")
            return {"error": str(e)}
    else:
        return {"error": "Model not found"}

    print("finish response x1")
    return response
