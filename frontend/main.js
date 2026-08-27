const WEBSITE_VERSION = "1.5.1";
const STORAGE_VERSION = "1.0.0";// 存储版本号，用于判断是否需要清空localStorage中的对话历史记录
var dialogHistory = [];         // 用于存储对话上下文的数组（不包含思考过程）
var dialogHistoryForClient = [];// 用于存储不发送给后端，需要保存在storage的对话历史（包含思考过程、markdown设置等内容）
var isFirstMessage = true;      // 标记是否是第一条消息(用于在第一天消息时清空欢迎语)
var aiAnswerCount = 0;          // 标记ai回答的条数，用于给每条ai答复绑定一个id
var animationInterval;
const FETCH_URL = "http://localhost:32767/";  //向服务器请求的根URL

/**
 * localStorage 管理器，负责对话历史的持久化存储
 * @class
 */
class localStorageManager {
    /**
     * 从 localStorage 读取存储的对话历史
     * @returns {{value: Array, infor: string}} 返回包含对话历史数组和状态信息的对象
     *   - infor 为 "successful" 表示读取成功
     *   - infor 为 "error version" 表示存储版本不一致，已自动清空并重新初始化
     *   - infor 为 "no storage" 表示没有存储记录，已自动初始化
     */
    static read() {
        if (localStorage.getItem("dsChat-storageVersion")) { // 查看是否存在存储版本号
            var storageVersion = localStorage.getItem("dsChat-storageVersion");
            if (storageVersion !== STORAGE_VERSION) { // 存储版本号不一致，清空对话历史
                console.log("检测到存储版本号不一致，已清空存储的历史记录：", storageVersion);
                localStorageManager.remove();
                localStorageManager.init();
                return {
                    value: [],
                    infor: "error version"
                };  // 返回一个空的对话历史记录，同时附上信息，告知这是第一次打开新版本（通常用于更新storage格式、弹出新版本弹窗等）
            } else {    //版本号一致，可以直接读取
                if (localStorage.getItem("dsChat-dialogHistory")) { //检查一遍是否存在，防止意外（尽管version正确就应该不会不存在)
                    return {
                        value: JSON.parse(localStorage.getItem("dsChat-dialogHistory")),
                        infor: "successful"
                    }
                }
            }
        } else {
            localStorageManager.init(); // 初始化一个空的对话历史记录
            return {
                value: [],
                infor: "no storage"
            }
        }
    }
    /**
     * 删除 localStorage 中存储的对话历史
     */
    static remove() {
        localStorage.removeItem("dsChat-dialogHistory");
        localStorage.removeItem("dsChat-storageVersion");
    }
    /**
     * 初始化 localStorage，创建一个空的对话历史记录并写入当前存储版本号
     */
    static init() {
        localStorage.setItem("dsChat-dialogHistory", JSON.stringify([]));
        localStorage.setItem("dsChat-storageVersion", STORAGE_VERSION);
    }
    /**
     * 将对话历史写入 localStorage
     * @param {Array} value - 要存储的对话历史数组
     * @returns {{infor: string, content?: Error}} 返回操作结果，infor 为 "successful" 或 "error"
     */
    static write(value) {
        try {
            localStorage.setItem("dsChat-dialogHistory", JSON.stringify(value))
        } catch (error) {   // 存储时出错
            console.error(error)
            return {
                infor: "error",
                content: error
            }
        }
        // 未出错正常返回
        return {
            infor: "successful"
        }
    }
}

/**
 * client 历史记录中每条消息的数据格式
 * @typedef {Object} DialogMessage
 * @property {"user"|"assistant"} role - 消息角色
 * @property {string} content - 消息正文内容
 * @property {string} [reasoning_content] - 深度思考内容（仅 AI 回复可选包含）
 * @property {"text"|"zero-md"} style - 渲染方式，text 为纯文本，zero-md 为 Markdown
 */

/**
 * 初始化页面：从 localStorage 读取对话历史并在页面中渲染
 */

function initPage() {       //初始化页面
    var storageResult = localStorageManager.read();  // 从localStorage中获取对话历史记录
    if (storageResult.infor === "successful") { //存在对话历史记录
        dialogHistoryForClient = storageResult.value;
        showDialogHistory(storageResult.value);
    } else {
        console.log("没有读取到对话历史记录");
    }
}
document.addEventListener("DOMContentLoaded", initPage);    //在页面加载完成后执行获取对话历史

function showDialogHistory(messages) {
    var thisRole = "user";  // 当前角色(user/assistant)，用于检测记录是否符合user-assistant-user-assistant的顺序
    for (let i = 0; i < messages.length; i++) {   // 遍历并渲染每条历史
        let eachDialog = messages[i];
        if (!eachDialog.role || !eachDialog.content || eachDialog.role !== thisRole) {   // 记录不完整或顺序不对，丢弃所有记录
            console.warn("检测到不完整或顺序不对的历史记录，已删除存储的历史记录：", eachDialog);
            localStorageManager.remove();
            localStorageManager.init();
            //注意这里要清空全局的历史记录变量
            dialogHistoryForClient = [];
            dialogHistory = [];
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
                outputAiAnswer(eachDialog.content, thinkingPart, eachDialog.style);   // 输出AI回答和思考过程
            } else {
                outputAiAnswer(eachDialog.content, null, eachDialog.style);   // 只输出AI回答
            }
            dialogHistory.push({ "role": "assistant", "content": eachDialog.content }); // 将AI的回答添加到对话历史中
            thisRole = "user";  // 切换角色为user，准备检测下一条记录是否符合顺序要求
        }
    }
    console.log("已输出存储的对话历史，此时上下文：", dialogHistory);
}

/**
 * 根据指定的类型创建文本元素（用于输出 AI 回答）
 * @param {string} content - 文本内容
 * @param {"text"|"zero-md"} type - 渲染类型，text 为纯文本，zero-md 为 Markdown
 * @returns {HTMLParagraphElement} 包含文本内容的 p 元素
 */
function createTextElement(content, type) {
    if (type === "zero-md") {
        // 使用 zero-md 组件渲染 Markdown：需要构造 <zero-md><script type="text/markdown">...</script></zero-md> 结构
        var pElement = document.createElement("p");
        var mdElement = document.createElement("zero-md");
        var scriptElement = document.createElement("script");
        scriptElement.type = "text/markdown";       // 指定脚本类型为 markdown
        scriptElement.innerHTML = "\n" + content;   // 开头加换行避免 Markdown 首行解析异常
        mdElement.appendChild(scriptElement);       // 将 markdown 脚本塞入 zero-md 组件
        pElement.appendChild(mdElement);            // 外包一层 p 便于统一样式
        return pElement;
    }
    if (type === "text") {
        // 纯文本模式：直接用 innerText 设置，保留原文格式
        var textElement = document.createElement("p");
        textElement.innerText = content;
        return textElement;
    }
}

/**
 * 创建菜单栏，位于每条 AI 回答的左下角或用户问题的右下角
 * @param {"user"|"ai"} type - 菜单栏所属的消息类型
 * @param {number} targetId - 对应的唯一 ID
 * @returns {HTMLDivElement} 菜单栏容器元素
 */
function createMenuBar(type, targetId) {
    var menuElement = document.createElement("div");
    menuElement.className = "menuBar";
    if (type === "user") {          // 位于用户问题的菜单栏
        return menuElement;
    } else if (type === "ai") {     // 位于AI回答的菜单栏
        //markdown渲染开关
        var markdownButton = document.createElement("span");
        markdownButton.className = "menuBarButton";
        markdownButton.innerHTML = "<img src='pic/mdButton.svg'>";
        markdownButton.appendChild(document.createTextNode("切换Markdown"));
        //事件绑定
        markdownButton.onclick = () => { changeMarkdown(targetId) }
        menuElement.appendChild(markdownButton);
        return menuElement;
    }
}

/**
 * 切换指定 AI 回答的 Markdown 渲染状态（text ↔ zero-md）
 * @param {number} targetId - 要切换的 AI 回答的唯一 ID
 */
function changeMarkdown(targetId) {
    // 找到页面上对应的旧元素
    var oldElement = document.getElementById("aiAnswer" + targetId);
    // dialogHistoryForClient 按 [user, assistant, user, assistant, ...] 排列，
    // 第 n 条 AI 回答在数组中的索引为 n*2+1，这里直接翻转其 style 标记
    dialogHistoryForClient[targetId * 2 + 1].style = dialogHistoryForClient[targetId * 2 + 1].style == "text" ? "zero-md" : "text";
    localStorageManager.write(dialogHistoryForClient);  // 更新storage以保存markdown设置
    // 根据翻转后的 style 创建新的渲染元素
    var newElement = createTextElement(dialogHistoryForClient[targetId * 2 + 1].content, dialogHistoryForClient[targetId * 2 + 1].style);
    newElement.className = "answerPart";
    newElement.id = "aiAnswer" + targetId;  // 给新元素也绑定唯一 ID
    // 用新元素替换旧元素
    document.getElementsByTagName("main")[0].replaceChild(newElement, oldElement);
}

/**
 * 在页面上输出用户的问题
 * @param {string} message - 用户输入的消息内容
 */
function outputUserAnswer(message) {
    var userQuestionElement = document.createElement("div");
    userQuestionElement.className = "questionArea";
    userQuestionElement.innerText = message;
    document.getElementsByTagName("main")[0].appendChild(userQuestionElement);
}

/**
 * 在页面上输出 AI 的回答（含可选的思考过程）
 * @param {string} message - AI 回答的正文内容
 * @param {string|null} [reasoningContent=null] - 深度思考过程的内容，为 null 表示无思考过程
 * @param {"text"|"zero-md"} [useMarkdown="zero-md"] - 渲染方式
 * @param {number|null} [aiAnswerId=null] - AI 回答的唯一 ID（当前未使用，保留参数）
 */
function outputAiAnswer(message, reasoningContent = null, useMarkdown = "zero-md", aiAnswerId = null) {
    // 注意：thinkingElement 使用 var 声明，存在变量提升，在 if 块外也可访问（值为 undefined 表示无思考内容）
    if (reasoningContent) {
        // 创建思考过程的标题
        var thinkingTitleElement = document.createElement("div");
        thinkingTitleElement.className = "eachtitle";
        thinkingTitleElement.innerText = "思考过程：\n";
        // 创建思考过程的内容元素（强制使用纯文本渲染）
        var thinkingElement = createTextElement(reasoningContent, "text");
        thinkingElement.className = "thinkingPart";
    }
    // 创建回答正文元素
    var answerElement = createTextElement(message, useMarkdown);
    answerElement.className = "answerPart";
    answerElement.id = "aiAnswer" + aiAnswerCount;  // 绑定唯一 ID，供菜单栏（如切换 Markdown）定位
    // 获取聊天区域的 DOM 引用
    var chatArea = document.getElementsByTagName("main")[0];
    // 如果有思考内容，先追加思考标题和思考内容
    if (thinkingElement) {
        chatArea.appendChild(thinkingTitleElement);
        chatArea.appendChild(thinkingElement);
    }
    // 追加回答正文
    chatArea.appendChild(answerElement);
    // 创建并追加 AI 回答的菜单栏（含 Markdown 切换按钮等）
    var menuElement = createMenuBar("ai", aiAnswerCount);
    chatArea.appendChild(menuElement);
    // 自增计数器，为下一条 AI 回答准备新 ID
    aiAnswerCount++;
}

function changeModel() {
    const modelSelect = document.getElementById("modelSelect");
}

/**
 * 清空输出区域，恢复为默认欢迎语
 */
function clearOutputArea() {
    let outerhtml = "<h1>欢迎使用deepseek对话网页版</h1><p>这是deepseek对话的前端页面，您可以在这里与deepseek进行交互。</p>";
    document.getElementsByTagName("main")[0].innerHTML = outerhtml;
}

/**
 * 开启新对话：清空当前对话历史、localStorage 存储并恢复欢迎页
 * 会弹出确认对话框防止误操作
 */
function setNewChat() {
    if (isFirstMessage) {
        return; // 如果当前是第一条消息，直接返回，不需要确认，也不需要任何操作
    }
    if (!confirm("确定要开启新的对话吗？当前对话历史将被删除，无法恢复！")) {
        return; // 用户取消，直接返回
    }
    isFirstMessage = true;  // 重置第一条消息标记
    aiAnswerCount = 0;      //重置ai回答数量，防止id分配错误
    dialogHistory = [];  // 清空对话历史
    dialogHistoryForClient = [];  // 清空用于存储的对话历史
    localStorageManager.remove();  // 清空localStorage中的对话历史记录
    localStorageManager.init();
    clearOutputArea();   // 清空输出区域
    // 保留用户输入框中的内容，方便用户继续输入新问题
}

/**
 * 页面关闭/刷新前的确认提示。仅在有对话消息时触发，防止误离开导致对话丢失
 * @returns {string|undefined} 返回提示字符串以触发浏览器确认弹窗，无消息时返回 undefined 不拦截
 */
window.onbeforeunload = function () {
    if (!isFirstMessage) { // 只有在已经有消息的情况下才提示，避免用户打开页面时就看到提示
        return "确定要离开/刷新吗？当前对话历史将丢失，无法恢复！"; // 返回一个字符串会触发浏览器的离开/刷新确认提示
    }
}

/**
 * 等待动画：在"..."、"."、".." 三种状态之间循环切换，模拟加载中的动画效果
 * 由 setInterval 定时调用
 */
function WaitingAnimation() {
    // 如果动画区域不存在（可能已被移除），直接返回避免报错
    if (!document.getElementById("animationArea")) {
        return;
    }
    // 在 "..." → "." → ".." → "..." 之间循环切换，模拟加载动画
    if (document.getElementById("animationArea").innerText == "...") {
        document.getElementById("animationArea").innerText = ".";
    } else if (document.getElementById("animationArea").innerText == ".") {
        document.getElementById("animationArea").innerText = "..";
    } else if (document.getElementById("animationArea").innerText == "..") {
        document.getElementById("animationArea").innerText = "...";
    }
}

function showDialog(dialogId) {
    var dialog = document.getElementById("defaultDialog");
    if (dialogId === "version") {
        innerStr = `
            <h2>版本信息</h2>
            <p>版本号：${WEBSITE_VERSION}</p>
            <h2>更新日志：</h2>
            <ul>
                <li>添加了右上角的菜单按钮和下拉菜单。</li>
                <li>所有弹窗界面升级。</li>
            </ul>
            <button commandfor="defaultDialog" command="close">关闭</button>
        `;
    } else if (dialogId === "about") {
        innerStr = `
            <h2>关于 deepseek 对话网页版</h2>
            <p>作者：HangCRH</p>
            <p>邮箱：<a href="mailto:1317806770@qq.com">1317806770@qq.com</a></p>
            <p>GitHub：<a href="https://github.com/HangCRH/Deepseek-Chat-Website" target="_blank">Deepseek-Chat-Website</a></p>
            <button commandfor="defaultDialog" command="close">关闭</button>
        `;
    }
    dialog.innerHTML = innerStr;
    dialog.showModal();
}