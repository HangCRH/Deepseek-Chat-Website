var animationInterval;
function sendRequest() {
    console.log("开始发送请求");
    document.getElementById("sendbtn").disabled = true;
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
    var returndata;
    let outerhtml = "<h1>正在生成答复，请稍候<span id='animationArea'>...</span></h1><p>由于技术垃圾，在生成完答复后才会展示回答。</p>";
    // 添加动画
    animationInterval = setInterval(WaitingAnimation, 500);
    document.getElementsByTagName("main")[0].innerHTML = outerhtml;
    // 发送请求
    fetch("http://8.138.175.15:32767/ds/" + useModel + "/" + encodeURIComponent(message))
        .then((response) => response.json())
        .then((data) => {
            returndata = data;
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
    }
    // 创建回答正文元素
    var answerElement = document.createElement("p");
    answerElement.className = "answerPart";
    answerElement.innerText = answerPart;
    // 创建用户输入的问题元素
    var userQuestionElement = document.createElement("div");
    userQuestionElement.className = "questionArea";
    userQuestionElement.innerText = document.getElementById("userInput").value;
    // 将思考过程和回答正文添加到页面
    var chatArea = document.getElementsByTagName("main")[0];
    chatArea.innerHTML = "";
    chatArea.appendChild(userQuestionElement);
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
function outMenu() {
    var alertstr = "版本：1.1.1\n\n" +
        "更新内容：\n" +
        "1.修复了部分显示问题。\n" +
        "2.每次对话都在模型输出上方显示输入的问题。\n" +
        "3.在等待模型输出时添加一个小动画。\n\n" +
        "联系开发者：\n" +
        "邮箱：1317806770@qq.com\n";
    alert(alertstr);
}