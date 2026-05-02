const WEBSITE_VERSION = "1.3.1";
var dialogHistory = [];  // 用于存储对话上下文的数组（不包含思考过程）
var dialogHistoryForClient = [];  // 用于存储不发送给后端，需要保存在storage的对话历史（包含思考过程等内容）
var isFirstMessage = true;  // 标记是否是第一条消息(用于在第一天消息时清空欢迎语)
var animationInterval;
const FETCH_URL = "http://localhost:32767/";  //向服务器请求的根URL

function getModelList() {   //初始化模型列表，网页加载后立即执行
    function writeModelSelect(modelList) {  //处理获取的模型列表
        var modelSelector = document.getElementById("modelSelect");
        modelSelector.innerHTML = "";
        for (let i = 0; i < modelList.length; i++) {
            var option = document.createElement("option");
            option.value = modelList[i].name;           //实际使用的模型名称，发送给后端
            option.text = modelList[i].display_name;    //展示给用户看的模型名称
            modelSelector.appendChild(option);          //添加至模型列表选择框
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

function getDialogHistory() {       //获取存储的对话历史
    if (localStorage.getItem("dsChat-dialogHistory")) { //存在对话历史记录
        dialogHistoryForClient = JSON.parse(localStorage.getItem("dsChat-dialogHistory"));  // 从localStorage中获取对话历史记录
        var thisRole = "user";  // 当前角色(user/assistant)，用于检测记录是否符合user-assistant-user-assistant的顺序
        for (let i = 0; i < dialogHistoryForClient.length; i++) {   // 遍历并渲染每条历史
            let eachDialog = dialogHistoryForClient[i];
            if (!eachDialog.role || !eachDialog.content || eachDialog.role !== thisRole) {   // 记录不完整或顺序不对，丢弃这条记录
                console.warn("检测到不完整或顺序不对的历史记录，已删除存储的历史记录：", eachDialog);
                localStorage.removeItem("dsChat-dialogHistory");
                return;
            }
            // 如果是第一条消息，清空欢迎语
            if (isFirstMessage) {
                document.getElementsByTagName("main")[0].innerHTML = "";
                isFirstMessage = false;
            }
            if (eachDialog.role === "user") {
                // 创建用户输入的问题元素
                var userQuestionElement = document.createElement("div");
                userQuestionElement.className = "questionArea";
                userQuestionElement.innerText = eachDialog.content;
                var chatArea = document.getElementsByTagName("main")[0];
                chatArea.appendChild(userQuestionElement);
                dialogHistory.push({ "role": "user", "content": eachDialog.content }); // 将AI的回答添加到对话历史中
                thisRole = "assistant"; // 切换角色为assistant，准备检测下一条记录是否符合顺序要求
            }
            if (eachDialog.role === "assistant") {
                if (eachDialog.reasoning_content) {    //有深度思考内容，要显示出来
                    var thinkingPart = eachDialog.reasoning_content;   // 获取思考过程
                    // 创建思考过程的标题
                    var thinkingTitleElement = document.createElement("div");
                    thinkingTitleElement.className = "eachtitle";
                    thinkingTitleElement.innerText = "思考过程：\n";
                    // 创建思考过程的内容元素
                    var thinkingElement = document.createElement("p");
                    thinkingElement.className = "thinkingPart";
                    thinkingElement.innerText = thinkingPart;
                }
                dialogHistory.push({ "role": "assistant", "content": answerPart }); // 将AI的回答添加到对话历史中
                // 创建回答正文元素
                var answerElement = document.createElement("p");
                var answerPart = eachDialog.content;
                answerElement.className = "answerPart";
                answerElement.innerText = answerPart;
                // 将思考过程和回答正文添加到页面
                var chatArea = document.getElementsByTagName("main")[0];
                if (thinkingElement) {
                    chatArea.appendChild(thinkingTitleElement);
                    chatArea.appendChild(thinkingElement);
                }
                chatArea.appendChild(answerElement);
                thisRole = "user";  // 切换角色为user，准备检测下一条记录是否符合顺序要求
            }
        }
        console.log("已输出存储的对话历史，此时上下文：", dialogHistory);
    } else {
        console.log("没有读取到对话历史记录");
        localStorage.setItem("dsChat-dialogHistory", JSON.stringify([]));  // 初始化一个空的对话历史记录
        dialogHistoryForClient = [];    // 初始化对话历史记录的变量(虽然网页刚加载好就是空的，但我不加看着难受——HangCRH)
    }
}
document.addEventListener("DOMContentLoaded", getDialogHistory);    //在页面加载完成后执行获取对话历史

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

function WaitingAnimation() {
    if (!document.getElementById("animationArea")) {
        return;
    }
    if (document.getElementById("animationArea").innerText == "...") {
        document.getElementById("animationArea").innerText = ".";
    } else if (document.getElementById("animationArea").innerText == ".") {
        document.getElementById("animationArea").innerText = "..";
    } else if (document.getElementById("animationArea").innerText == "..") {
        document.getElementById("animationArea").innerText = "...";
    }
}

function processResponse(responseData, userMessage) {
    if (responseData.error || !responseData.choices[0].message) {
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
    //检查是否有深度思考内容，如果有，将思考内容和正式回答一起添加到用于存储的对话历史中并输出；如果没有，就只添加和输出正式回答
    if (responseData.choices[0].message.reasoning_content) {
        var thinkingPart = responseData.choices[0].message.reasoning_content;   // 获取思考过程
        // 添加含深度思考的AI回答到用于存储的对话记录
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart, "reasoning_content": thinkingPart });
        // 创建思考过程的标题
        var thinkingTitleElement = document.createElement("div");
        thinkingTitleElement.className = "eachtitle";
        thinkingTitleElement.innerText = "思考过程：\n";
        // 创建思考过程的内容元素
        var thinkingElement = document.createElement("p");
        thinkingElement.className = "thinkingPart";
        thinkingElement.innerText = thinkingPart;
    } else {
        // 没有深度思考，只添加正式回答到用于存储的对话记录
        dialogHistoryForClient.push({ "role": "assistant", "content": answerPart });
    }
    console.log("ai回答后的对话历史：", dialogHistory);
    console.log("ai回答后的用于存储的对话历史：", dialogHistoryForClient);
    // 更新storage
    localStorage.setItem("dsChat-dialogHistory", JSON.stringify(dialogHistoryForClient));
    // 创建回答正文元素
    var answerElement = document.createElement("p");
    answerElement.className = "answerPart";
    answerElement.innerText = answerPart;
    // 创建用户输入的问题元素
    var userQuestionElement = document.createElement("div");
    userQuestionElement.className = "questionArea";
    userQuestionElement.innerText = userMessage;
    // 移除等待模型回答的提示信息
    var promptDiv = document.getElementById("promptDiv");
    if (promptDiv) {
        document.getElementsByTagName("main")[0].removeChild(promptDiv);
    }
    // 将思考过程和回答正文添加到页面
    var chatArea = document.getElementsByTagName("main")[0];
    chatArea.appendChild(userQuestionElement);
    if (thinkingElement) {
        chatArea.appendChild(thinkingTitleElement);
        chatArea.appendChild(thinkingElement);
    }
    chatArea.appendChild(answerElement);
    document.getElementById("userInput").value = "";    // 清空输入框(为了使用体验，在输出答复后才清空输入框)
}

function changeModel() {
    const modelSelect = document.getElementById("modelSelect");
}

function clearOutputArea() {
    let outerhtml = "<h1>欢迎使用deepseek对话网页版</h1><p>这是deepseek对话的前端页面，您可以在这里与deepseek进行交互。</p>";
    document.getElementsByTagName("main")[0].innerHTML = outerhtml;
}

function setNewChat() {
    if (isFirstMessage) {
        return; // 如果当前是第一条消息，直接返回，不需要确认，也不需要任何操作
    }
    if (!confirm("确定要开启新的对话吗？当前对话历史将被删除，无法恢复！")) {
        return; // 用户取消，直接返回
    }
    isFirstMessage = true;  // 重置第一条消息标记
    dialogHistory = [];  // 清空对话历史
    dialogHistoryForClient = [];  // 清空用于存储的对话历史
    localStorage.setItem("dsChat-dialogHistory", JSON.stringify([]));  // 清空localStorage中的对话历史记录
    clearOutputArea();   // 清空输出区域
    // 保留用户输入框中的内容，方便用户继续输入新问题
}

window.onbeforeunload = function () {
    if (!isFirstMessage) { // 只有在已经有消息的情况下才提示，避免用户打开页面时就看到提示
        return "确定要离开/刷新吗？当前对话历史将丢失，无法恢复！"; // 返回一个字符串会触发浏览器的离开/刷新确认提示
    }
}

function outMenu() {
    var alertstr = "版本：" + WEBSITE_VERSION + "\n\n" +
        "更新内容：\n" +
        "1、渲染markdown。\n" +
        "    ·技术支持：zero-md" +
        "2、保存历史对话，下次打开都能恢复上一次的记录（除非手动开启新对话）。\n" +
        "\n联系开发者：\n" +
        "邮箱：1317806770@qq.com\n";
    alert(alertstr);
}