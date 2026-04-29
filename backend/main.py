from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import getai

class Message(BaseModel):
    model: str
    messages: list = []  # 包括当前问题在内的上下文字段

app = FastAPI()

origins = ["http://8.138.175.15:32768/","http://8.138.175.15:32767/","*"] #允许跨域请求的来源列表

#允许进行跨域请求(CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.post("/ds/")   #这里使用post，原因：使用post可以用请求体发送数据，且在ai对话中post比get更符合http语义建议
async def read_item(messageWithHistory: Message):
    result = await getai.get_response(messageWithHistory.model, messageWithHistory.messages)
    return result

@app.get("/ds/modellist")
async def get_model_list():
    return getai.model_list