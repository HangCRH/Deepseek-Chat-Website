import getai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


class Message(BaseModel):
    model: str
    messages: list = []  # 包括当前问题在内的上下文字段


app = FastAPI()

origins = ["http://localhost:5500", "http://127.0.0.1:5500"]  # 允许跨域请求的来源列表

# 允许进行跨域请求(CORS)
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"]
)


@app.post("/ds/chat/")
async def chat(messageWithHistory: Message):
    result = None
    if not messageWithHistory.model or not messageWithHistory.messages:
        return {"error": "Model and messages are required."}
    result = await getai.get_response(
        messageWithHistory.model, messageWithHistory.messages
    )
    return result


@app.get("/ds/modellist/")
async def get_model_list():
    return getai.model_list


@app.post("/ds/")
async def old_chat(messageWithHistory: Message):
    # 兼容旧版本(网页版1.3.0+), 这两个名字已经被deepseek官方弃用，替换为deepseek-v4-flash-chat和deepseek-v4-flash-high
    result = None
    if not messageWithHistory.model or not messageWithHistory.messages:
        return {"error": "Model and messages are required."}
    if messageWithHistory.model == "deepseek-chat":
        result = await getai.get_response(
            "deepseek-v4-flash-chat", messageWithHistory.messages
        )
    elif messageWithHistory.model == "deepseek-reasoner":
        result = await getai.get_response(
            "deepseek-v4-flash-high", messageWithHistory.messages
        )
    return result
