import asyncio, datetime, os
from openai import OpenAI

#返回给前端的模型列表，前端会根据这个列表展示可选的模型选项和对应模型名，后端需映射成参数
model_list=[
    {"name": "deepseek-v4-flash-chat", "display_name": "DeepSeek V4 Flash 非深度思考"},
    {"name": "deepseek-v4-flash-high", "display_name": "DeepSeek V4 Flash 深度思考-high"},
    {"name": "deepseek-v4-flash-max", "display_name": "DeepSeek V4 Flash 深度思考-max"},
    {"name": "deepseek-v4-pro-chat", "display_name": "DeepSeek V4 Pro 非深度思考"},
    {"name": "deepseek-v4-pro-high", "display_name": "DeepSeek V4 Pro 深度思考-high"},
    {"name": "deepseek-v4-pro-max", "display_name": "DeepSeek V4 Pro 深度思考-max"}
]

#用于将前端模型名映射为请求参数
model_name_to_param = {
    "deepseek-v4-flash-chat": {
        "model": "deepseek-v4-flash",
        "extra_body": {
            "thinking": {
                "type": "disabled"
            }
        }
    },
    "deepseek-v4-flash-high": {
        "model": "deepseek-v4-flash",
        "extra_body": {
            "thinking": {
                "type": "enabled"
            }
        },
        "reasoning_effort": "high"
    },
    "deepseek-v4-flash-max": {
        "model": "deepseek-v4-flash",
        "extra_body": {
            "thinking": {
                "type": "enabled"
            }
        },
        "reasoning_effort": "max"
    },
    "deepseek-v4-pro-chat": {
        "model": "deepseek-v4-pro",
        "extra_body": {
            "thinking": {
                "type": "disabled"
            }
        }
    },
    "deepseek-v4-pro-high": {
        "model": "deepseek-v4-pro",
        "extra_body": {
            "thinking": {
                "type": "enabled"
            }
        },
        "reasoning_effort": "high"
    },
    "deepseek-v4-pro-max": {
        "model": "deepseek-v4-pro",
        "extra_body": {
            "thinking": {
                "type": "enabled"
            }
        },
        "reasoning_effort": "max"
    }
}

client_normal = OpenAI(
    api_key=os.getenv("deepseekAPI"),
    base_url="https://api.deepseek.com/")

async def get_response(use_model, user_message):
    def blocking_call():
        if model_name_to_param[use_model]:  #模型名存在
            param = model_name_to_param[use_model]  #根据模型名获取请求参数
            if param["extra_body"]["thinking"]["type"] == "enabled":    #思考模式
                try:
                    return client_normal.chat.completions.create(
                        model=param["model"],
                        messages=user_message,  # 由于在客户端已经将用户输入和上下文合并成一个列表，所以这里直接传递这个列表即可
                        extra_body=param["extra_body"],
                        reasoning_effort=param["reasoning_effort"],
                        stream=False
                    )
                except Exception as e:
                    print(f"Error in blocking_call: {e}")
                    return {"error": str(e)}
            elif param["extra_body"]["thinking"]["type"] == "disabled":  #非思考模式
                try:
                    return client_normal.chat.completions.create(
                        model=param["model"],
                        messages=user_message,
                        extra_body=param["extra_body"],
                        stream=False
                    )
                except Exception as e:
                    print(f"Error in blocking_call: {e}")
                    return {"error": str(e)}
            else:
                return {"error": "Invalid thinking parameter"}
        else:
            return {"error": "Model not found"}
    # 把同步阻塞调用放到线程池中运行，避免阻塞事件循环
    response = await asyncio.to_thread(blocking_call)
    final_question = user_message[-1]['content'] if user_message else "No question provided"
    print(f"finish response x1 for question: {final_question}")
    return response