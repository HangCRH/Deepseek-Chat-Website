import asyncio, datetime
from openai import OpenAI

client_normal = OpenAI(
    api_key='sk-***',   #由于作者安全性不强，当初没有开源时把api_key放在代码里了（下同）
    base_url="https://api.deepseek.com/")

client_super = OpenAI(      #增强版v3.2思考：https://api.deepseek.com/v3.2_speciale_expires_on_20251215/
    api_key='sk-***',
    base_url="https://api.deepseek.com/v3.2_speciale_expires_on_20251215/")

async def get_response(use_client_str, use_model, user_message):
    if use_client_str == "normal":
        use_client = client_normal
    elif use_client_str == "super":
        use_client = client_super
    else:
        return {"error": "error client"}
    if datetime.datetime.now() > datetime.datetime(2025, 12, 15):
        return {"error": "The super client has expired"}
    def blocking_call():
        return use_client.chat.completions.create(
            model=use_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant"},
                {"role": "user", "content": user_message},
            ],
            stream=False
        )
    # 把同步阻塞调用放到线程池中运行，避免阻塞事件循环
    response = await asyncio.to_thread(blocking_call)
    print("finish response x1")
    return response