import asyncio, datetime
from openai import OpenAI

client_normal = OpenAI(
    api_key='sk-***',   #还是打个码，原因见以前的backend代码
    base_url="https://api.deepseek.com/")

async def get_response(use_model, user_message):
    use_client = client_normal
    def blocking_call():
        try:
            return use_client.chat.completions.create(
                model=use_model,
                messages=user_message,  # 由于在客户端已经将用户输入和上下文合并成一个列表，所以这里直接传递这个列表即可
                stream=False
            )
        except Exception as e:
            print(f"Error in blocking_call: {e}")
            return {"error": str(e)}
    # 把同步阻塞调用放到线程池中运行，避免阻塞事件循环
    response = await asyncio.to_thread(blocking_call)
    final_question = user_message[-1]['content'] if user_message else "No question provided"
    print(f"finish response x1 for question: {final_question}")
    return response