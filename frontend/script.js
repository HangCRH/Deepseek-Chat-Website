const WEBSITE_VERSION = "1.2.0";
var dialogHistory = [];  // 用于存储对话上下文的数组
var isFirstMessage = true;  // 标记是否是第一条消息(用于在第一天消息时清空欢迎语)
var animationInterval;
const FETCH_URL = "http://localhost:32767/ds/";  //向服务器请求的URL
function sendRequest() {
    console.log("开始发送请求");
    document.getElementById("sendbtn").disabled = true; // 在发送请求时禁用发送按钮，防止重复点击
    var chosenModel = document.getElementById("modelSelect").value;
    var message = document.getElementById("userInput").value;
    var useModel;
    switch (chosenModel) {
        case "v3.2chat":
            useModel = "deepseek-chat";
            break;
        case "v3.2reasoner":
            useModel = "deepseek-reasoner";
            break;
        default:
            console.log("未知模型");
            break;
    }
    console.log(useModel, message);
    dialogHistory.push({ "role": "user", "content": message });  // 将用户输入添加到对话历史中
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
    // 发送请求
    fetch(FETCH_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({  // 将数据放在请求体中发送
            model: useModel,
            messages: dialogHistory
        })
    })
        .then((response) => response.json())
        .then((returndata) => {
            console.log("fetch请求成功，返回数据：", returndata);
            processResponse(returndata, useModel);
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
function processResponse(responseData, useModel) {
    if (responseData.error || !responseData.choices[0]) {
        console.log("后端返回错误。responseData：" + responseData);
        alert("生成答复时出错。Err2\n" + responseData);
        return;
    }
    if (useModel == "deepseek-reasoner") {
        if (responseData.choices[0].message && responseData.choices[0].message.content) {
            var thinkingPart = responseData.choices[0].message.reasoning_content;   // 获取思考过程
            // 创建思考过程的标题
            var thinkingTitleElement = document.createElement("div");
            thinkingTitleElement.className = "eachtitle";
            thinkingTitleElement.innerText = "思考过程：\n";
            // 创建思考过程的内容元素
            var thinkingElement = document.createElement("p");
            thinkingElement.className = "thinkingPart";
            thinkingElement.innerText = thinkingPart;
        }
    }
    if (responseData.choices[0].message) {  // 确保message和content存在
        var answerPart = responseData.choices[0].message.content;
        dialogHistory.push({ "role": "assistant", "content": answerPart });  // 将AI的回答添加到对话历史中
        console.log("ai回答后的对话历史：", dialogHistory);
    }
    // 创建回答正文元素
    var answerElement = document.createElement("p");
    answerElement.className = "answerPart";
    answerElement.innerText = answerPart;
    // 创建用户输入的问题元素
    var userQuestionElement = document.createElement("div");
    userQuestionElement.className = "questionArea";
    userQuestionElement.innerText = document.getElementById("userInput").value;
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
    clearOutputArea();   // 清空输出区域
    // 保留用户输入框中的内容，方便用户继续输入新问题
}
window.onbeforeunload = function () {
    if (!isFirstMessage) { // 只有在已经有消息的情况下才提示，避免用户打开页面时就看到提示
        return "确定要离开/刷新吗？当前对话历史将丢失，无法恢复！"; // 返回一个字符串会触发浏览器的离开/刷新确认提示
    }
}
function outMenu() {
    var alertstr = "版本：1.2.0\n\n" +
        "更新内容：\n" +
        "1、支持连续对话。\n" +
        "    ·添加“开启新对话”按钮。\n" +
        "2、在模型回答完毕后清空输入框。\n" +
        "3、在关闭或刷新时提示用户确认，避免误操作导致对话历史丢失。\n" +
        "4、部分技术性更新。\n\n" +
        "联系开发者：\n" +
        "邮箱：1317806770@qq.com\n";
    alert(alertstr);
}