const WEBSITE_VERSION = "1.4.1";
var dialogHistory = [];  // 用于存储对话上下文的数组（不包含思考过程）
var dialogHistoryForClient = [];  // 用于存储不发送给后端，需要保存在storage的对话历史（包含思考过程等内容）
var isFirstMessage = true;  // 标记是否是第一条消息(用于在第一天消息时清空欢迎语)
var animationInterval;
const FETCH_URL = "http://localhost:32767/";  //向服务器请求的根URL

function showDialogHistory() {       //获取存储的对话历史
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
                outputUserAnswer(eachDialog.content); // 创建用户输入的问题元素
                dialogHistory.push({ "role": "user", "content": eachDialog.content }); // 将AI的回答添加到对话历史中
                thisRole = "assistant"; // 切换角色为assistant，准备检测下一条记录是否符合顺序要求
            }
            if (eachDialog.role === "assistant") {
                if (eachDialog.reasoning_content) {    //有深度思考内容，要显示出来
                    var thinkingPart = eachDialog.reasoning_content;   // 获取思考过程
                    outputAiAnswer(eachDialog.content, thinkingPart);   // 输出AI回答和思考过程
                } else {
                    outputAiAnswer(eachDialog.content);   // 只输出AI回答
                }
                dialogHistory.push({ "role": "assistant", "content": eachDialog.content }); // 将AI的回答添加到对话历史中
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
document.addEventListener("DOMContentLoaded", showDialogHistory);    //在页面加载完成后执行获取对话历史

function createTextElement(content, type) { // 创建文本元素，根据type决定是markdown还是普通文本，目前主要用于输出ai回答
    if (type === "zero-md") {
        var pElement = document.createElement("p");
        var mdElement = document.createElement("zero-md");
        var scriptElement = document.createElement("script");
        scriptElement.type = "text/markdown";
        scriptElement.innerHTML = "\n" + content;
        mdElement.appendChild(scriptElement);
        pElement.appendChild(mdElement);
        return pElement;
    }
    if (type === "text") {
        var textElement = document.createElement("p");
        textElement.innerText = content;
        return textElement;
    }
}

function createMenuBar(type) {      //创建菜单栏，位于每条ai回答的左下角和用户问题的右下角
    var menuElement = document.createElement("div");
    menuElement.className = "menuBar";
    if (type === "user") {          // 位于用户问题的菜单栏
        return menuElement;
    } else if (type === "ai") {     // 位于AI回答的菜单栏
        var markdownButton = document.createElement("span");
        markdownButton.className = "menuButton";
        markdownButton.innerHTML = "<img src='pic/mdButton.png'>";
        markdownButton.appendChild(document.createTextNode("切换Markdown"));
        menuElement.appendChild(markdownButton);
        return menuElement;
    }
}

function outputUserAnswer(message) {
    var userQuestionElement = document.createElement("div");
    userQuestionElement.className = "questionArea";
    userQuestionElement.innerText = message;
    document.getElementsByTagName("main")[0].appendChild(userQuestionElement);
}

function outputAiAnswer(message, reasoningContent = null) {
    //检查是否有深度思考内容
    if (reasoningContent) {
        // 创建思考过程的标题
        var thinkingTitleElement = document.createElement("div");
        thinkingTitleElement.className = "eachtitle";
        thinkingTitleElement.innerText = "思考过程：\n";
        // 创建思考过程的内容元素
        var thinkingElement = createTextElement(reasoningContent, "text");
        thinkingElement.className = "thinkingPart";
    }
    // 创建回答正文元素
    var answerElement = createTextElement(message, "zero-md");
    answerElement.className = "answerPart";
    // 将思考过程和回答正文添加到页面
    var chatArea = document.getElementsByTagName("main")[0];
    if (thinkingElement) {
        chatArea.appendChild(thinkingTitleElement);
        chatArea.appendChild(thinkingElement);
    }
    chatArea.appendChild(answerElement);
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

function outMenu() {
    var alertstr = "版本：" + WEBSITE_VERSION + "\n\n" +
        "更新内容：\n" +
        "1、bug修复：输入框不对称（略微偏右）。\n" +
        "2、标题栏固定在屏幕上方。\n" +
        "\n联系开发者：\n" +
        "邮箱：1317806770@qq.com\n";
    alert(alertstr);
}
