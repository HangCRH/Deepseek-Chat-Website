import asyncio, datetime
from openai import OpenAI

client_normal = OpenAI(
    api_key='sk-***',   #当初不懂，api明文存储于源代码了，暂时打个码
    base_url="https://api.deepseek.com/")

async def get_response(use_model, user_message):
    use_client = client_normal
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