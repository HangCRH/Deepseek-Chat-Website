from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import getai

app = FastAPI()

origins = ["http://8.138.175.15:32768/","*"] #允许跨域请求的来源列表

#允许进行跨域请求(CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/ds/{model}/{message}")
async def read_item(model: str, message: str):
    resualt = await getai.get_response(model, message)
    return resualt