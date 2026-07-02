function sendRequest() {
    console.log("开始发送请求");
    document.getElementById("sendbtn").disabled = true; // 在发送请求时禁用发送按钮，防止重复点击
    var useModel = document.getElementById("modelSelect").value;
    var message = document.getElementById("userInput").value;
    console.log(useModel, message);
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
    // 在发送请求前先展示提示信息
    let innerstr = "<h1>正在生成答复，请稍候<span id='animationArea'>...</span></h1><p>由于技术垃圾，在生成完答复后才会展示回答。</p>";
    var promptDiv = document.createElement("div");
    promptDiv.innerHTML = innerstr;
    promptDiv.id = "promptDiv";
    document.getElementsByTagName("main")[0].appendChild(promptDiv);
    // 添加动画
    animationInterval = setInterval(WaitingAnimation, 500);
    // 将当前用户输入和对话历史一起发送给后端
    // 注意：不能直接修改对话历史，要clone一份临时的，因为万一生成出错，用户重试，不会出现连续两个{"role":"user"}
    var tempDialogHistory = structuredClone(dialogHistory);
    tempDialogHistory.push({ "role": "user", "content": message });
    // 发送请求
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
            processResponse(returndata, message);
            document.getElementById("sendbtn").disabled = false;
            clearInterval(animationInterval);
        })
        .catch((err) => {
            console.error("fetch请求失败：", err);
            alert("生成答复时出错。Err1\n" + err);
            document.getElementById("sendbtn").disabled = false;
            clearInterval(animationInterval);
        });
}

function processResponse(responseData, userMessage) {
    if (responseData.error || !responseData.choices[0].message.content) {
        console.log("后端返回错误。responseData：" + responseData);
        alert("生成答复时出错。Err2\n" + responseData);
        return;
    }
    var answerPart = responseData.choices[0].message.content;   //获取回答的正文
    // 将用户输入和AI回答添加到对话历史中（注意：思考过程不添加到这个历史中，因为它不需要发送给后端）
    dialogHistory.push({ "role": "user", "content": userMessage });
    dialogHistory.push({ "role": "assistant", "content": answerPart });
    //将用户输入添加到用于存储的对话历史中（AI回答稍后添加，因为要考虑是否有深度思考并将正式回答和深度思考都放进去）
    dialogHistoryForClient.push({ "role": "user", "content": userMessage });
    // 移除等待模型回答的提示信息
    var promptDiv = document.getElementById("promptDiv");
    if (promptDiv) {
        document.getElementsByTagName("main")[0].removeChild(promptDiv);
    }
    outputUserAnswer(userMessage); // 创建用户输入的问题元素
    //检查是否有深度思考内容，如果有，将思考内容和正式回答一起添加到用于存储的对话历史中并输出；如果没有，就只添加和输出正式回答
    if (responseData.choices[0].message.reasoning_content) {
        var thinkingPart = responseData.choices[0].message.reasoning_content;   // 获取思考过程
        // 添加含深度思考的AI回答到用于存储的对话记录
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart, "reasoning_content": thinkingPart });
        outputAiAnswer(answerPart, thinkingPart);
    } else {
        // 没有深度思考，只处理正式回答
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart });
        outputAiAnswer(answerPart);
    }
    console.log("ai回答后的对话历史：", dialogHistory);
    console.log("ai回答后的用于存储的对话历史：", dialogHistoryForClient);
    // 更新storage
    localStorage.setItem("dsChat-dialogHistory", JSON.stringify(dialogHistoryForClient));
    document.getElementById("userInput").value = "";    // 清空输入框(为了使用体验，在输出答复后才清空输入框)
}