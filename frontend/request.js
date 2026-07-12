function getModelList() {   //初始化模型列表，网页加载后立即执行
    function writeModelSelect(modelList) {  //处理获取的模型列表
        var modelSelector = document.getElementById("modelSelect");
        modelSelector.innerHTML = "";
        for (let i = 0; i < modelList.length; i++) {
            var option = document.createElement("option");
            option.value = modelList[i].name;           // 实际使用的模型名称，发送给后端
            option.text = modelList[i].display_name;    // 展示给用户看的模型名称
            modelSelector.appendChild(option);          // 添加至模型列表选择框
        }
    }
    fetch(FETCH_URL + "ds/modellist/")      //获取模型列表
        .then((response) => response.json())
        .then((data) => {
            console.log("获取模型列表成功，返回数据：", data);
            writeModelSelect(data);
        })
        .catch((err) => {
            console.error("获取模型列表失败：", err);
            alert("获取模型列表失败，请刷新页面重试。若问题依旧，请联系开发者，并提供尽可能详细的信息。Err0\n" + err);
        });
}
document.addEventListener("DOMContentLoaded", getModelList);        //在页面加载完成后执行获取模型列表

/**
 * 发送聊天请求到后端
 * 会先展示等待提示和加载动画，请求成功后将响应交由 processResponse 处理
 */
function sendRequest() {
    console.log("开始发送请求");
    document.getElementById("sendbtn").disabled = true; // 在发送请求时禁用发送按钮，防止重复点击
    var useModel = document.getElementById("modelSelect").value;   // 获取当前选中的模型名称
    var message = document.getElementById("userInput").value;      // 获取用户输入的消息
    console.log(useModel, message);                                // 调试日志：输出模型和消息
    if (useModel == "waiting") {    // 如果模型列表还在加载中，提示用户稍后再试
        alert("模型列表加载中，请稍候再试！");
        document.getElementById("sendbtn").disabled = false;
        return;
    }
    console.log("当前对话历史：", dialogHistory);
    // 如果是第一条消息，清空欢迎语
    if (isFirstMessage) {
        document.getElementsByTagName("main")[0].innerHTML = "";
        isFirstMessage = false;
    }
    // 在发送请求前先展示"正在生成"的等待提示
    let innerstr = "<h1>正在生成答复，请稍候<span id='animationArea'>...</span></h1><p>由于技术垃圾，在生成完答复后才会展示回答。</p>";
    var promptDiv = document.createElement("div");
    promptDiv.innerHTML = innerstr;
    promptDiv.id = "promptDiv";                                           // 绑定 ID，方便请求完成后移除
    document.getElementsByTagName("main")[0].appendChild(promptDiv);      // 追加到聊天区域
    // 启动等待动画，每 500ms 切换一次 "..." 的状态
    animationInterval = setInterval(WaitingAnimation, 500);
    // 将当前用户输入和对话历史一起发送给后端
    // 注意：不能直接修改对话历史，要clone一份临时的，因为万一生成出错，用户重试，不会出现连续两个{"role":"user"}
    var tempDialogHistory = structuredClone(dialogHistory);
    tempDialogHistory.push({ "role": "user", "content": message });
    // 发送 POST 请求到后端聊天接口
    fetch(FETCH_URL + "ds/chat/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({  // 将数据放在请求体中发送
            model: useModel,
            messages: tempDialogHistory
        })
    })
        .then((response) => response.json())
        .then((returndata) => {
            console.log("fetch请求成功，返回数据：", returndata);
            processResponse(returndata, message); // 将响应数据交给 processResponse 统一处理
            document.getElementById("sendbtn").disabled = false;  // 恢复发送按钮
            clearInterval(animationInterval);                     // 停止等待动画
        })
        .catch((err) => {
            console.error("fetch请求失败：", err);
            alert("生成答复时出错。Err1\n" + err);
            document.getElementById("sendbtn").disabled = false;
            clearInterval(animationInterval);
        });
}

/**
 * 处理后端返回的聊天响应数据
 * 将用户输入和 AI 回答更新到对话历史、渲染到页面、并写入 localStorage
 * @param {Object} responseData - 后端返回的响应数据
 * @param {string} userMessage - 用户发送的原始消息
 */
function processResponse(responseData, userMessage) {
    // 校验后端返回：如果有 error 字段或缺少回答内容，视为出错
    if (responseData.error || !responseData.choices[0].message.content) {
        console.log("后端返回错误。responseData：" + responseData);
        alert("生成答复时出错。Err2\n" + responseData);
        return;  // 直接返回，不更新任何对话历史
    }
    var answerPart = responseData.choices[0].message.content;   // 提取 AI 回答的正文
    // 将用户输入和AI回答添加到对话历史中（注意：思考过程不添加到这个历史中，因为它不需要发送给后端）
    dialogHistory.push({ "role": "user", "content": userMessage });
    dialogHistory.push({ "role": "assistant", "content": answerPart });
    //将用户输入添加到用于存储的对话历史中（AI回答稍后添加，因为要考虑是否有深度思考并将正式回答和深度思考都放进去）
    dialogHistoryForClient.push({ "role": "user", "content": userMessage, "style": "text" });
    // 移除等待模型回答的提示信息
    var promptDiv = document.getElementById("promptDiv");
    if (promptDiv) {
        document.getElementsByTagName("main")[0].removeChild(promptDiv);
    }
    outputUserAnswer(userMessage); // 将用户问题渲染到页面
    // 检查是否有深度思考内容：
    // - 有：将思考内容和正式回答一起存入 client 历史并渲染
    // - 无：只存入和渲染正式回答
    if (responseData.choices[0].message.reasoning_content) {
        var thinkingPart = responseData.choices[0].message.reasoning_content;   // 获取思考过程
        // 添加含深度思考的 AI 回答到 client 历史
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart, "reasoning_content": thinkingPart, "style": "text" });
        outputAiAnswer(answerPart, thinkingPart, "text"); // 默认不渲染 markdown，用纯文本展示
    } else {
        // 没有深度思考，只处理正式回答
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart, "style": "text" });
        outputAiAnswer(answerPart, null, "text");         // 默认不渲染 markdown
    }
    console.log("ai回答后的对话历史：", dialogHistory);
    console.log("ai回答后的用于存储的对话历史：", dialogHistoryForClient);
    // 更新storage
    localStorageManager.write(dialogHistoryForClient);
    document.getElementById("userInput").value = "";    // 清空输入框(为了使用体验，在输出答复后才清空输入框)
}