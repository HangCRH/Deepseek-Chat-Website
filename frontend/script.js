function sendRequest() {
    console.log("开始发送请求");
    document.getElementById("sendbtn").disabled = true;
    var chosenModel = document.getElementById("modelSelect").value;
    var message = document.getElementById("userInput").value;
    var useClient, useModel;
    switch (chosenModel) {
        case "v3.2chat":
            useClient = "normal";
            useModel = "deepseek-chat";
            break;
        case "v3.2reasoner":
            useClient = "normal";
            useModel = "deepseek-reasoner";
            break;
        case "v3.2super":
            useClient = "super";
            useModel = "deepseek-reasoner";
            break;
        default:
            console.log("未知模型");
            break;
    }
    console.log(useClient, useModel, message);
    var returndata;
    let outerhtml = "<h1>正在生成答复，请稍候...</h1><p>由于技术垃圾，在生成完答复后才会展示回答。</p>";
    document.getElementsByTagName("main")[0].innerHTML = outerhtml;
    fetch("http://8.138.175.15:32767/" + useClient + "/" + useModel + "/" + encodeURIComponent(message))
        .then((response) => response.json())
        .then((data) => {
            returndata = data;
            console.log("fetch请求成功，返回数据：", returndata);
            processResponse(returndata, useModel);
            document.getElementById("sendbtn").disabled = false;
        })
        .catch((err) => {
            console.error("fetch请求失败：", err);
            alert("生成答复时出错。");
            document.getElementById("sendbtn").disabled = false;
        });
}
function processResponse(responseData, useModel) {
    if (responseData.error || !responseData.choices[0]) {
        console.log("后端返回错误。responseData：" + responseData);
        alert("生成答复时出错。");
        return;
    }
    if (useModel == "deepseek-reasoner") {
        if (responseData.choices[0].message && responseData.choices[0].message.content) {
            var thinkingPart = responseData.choices[0].message.reasoning_content;
            var thinkingTitleElement = document.createElement("span");
            thinkingTitleElement.className = "eachtitle";
            thinkingTitleElement.innerText = "思考过程：\n";
            var thinkingElement = document.createElement("p");
            thinkingElement.className = "thinkingPart";
            thinkingElement.innerText = thinkingPart;
        }
    }
    if (responseData.choices[0].message) {
        var answerPart = responseData.choices[0].message.content;
    }
    var answerElement = document.createElement("p");
    answerElement.className = "answerPart";
    answerElement.innerText = answerPart;
    var chatArea = document.getElementsByTagName("main")[0];
    chatArea.innerHTML = "";
    if (thinkingElement) {
        chatArea.appendChild(thinkingTitleElement);
        chatArea.appendChild(thinkingElement);
    }
    chatArea.appendChild(answerElement);
}
function changeModel() {
    const modelSelect = document.getElementById("modelSelect");
    if (modelSelect.value == "v3.2super") {
        alert("deepseeek v3.2增强深度思考版将于2025年12月15日停止支持，请注意时间。");
    }
}