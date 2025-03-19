/**
 * 输出提示栏组件 需要有dom环境
 * @version 0.2
 */
async function newLogFrame() {
  // 删除已存在frame
  document.querySelectorAll(".xiaoai-schedule-parser-log-base")?.forEach(e => e.remove());
  // 设置背景
  const baseElement = document.createElement("div");
  document.body.append(baseElement);
  baseElement.className = "xiaoai-schedule-parser-log-base";
  baseElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(127, 127, 127, 0.28);
      backdrop-filter: saturate(120%) blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: ${getMaxZIndex() + 1};
    `;
  function getMaxZIndex() {
    return [...document.querySelectorAll("*")].reduce((r, e) => Math.max(r, +window.getComputedStyle(e).zIndex || 0), 0) || 1
  }
  // 设置卡片
  const cardElement = document.createElement("iframe");
  // cardElement.src = "about:blank";
  baseElement.append(cardElement);
  // await new Promise(r => {
  //   const interval = setInterval(() => {
  //     console.log(1)
  //     if (cardElement.contentDocument || cardElement.contentWindow?.document) {
  //       clearInterval(interval);
  //       r();
  //     }
  //   }, 1);
  // });
  cardElement.style.cssText = `
      display: block;
      width: 100vh;
      max-width: 80%;
      max-height: 80%;
      border: none;
      border-radius: 10px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    `;
  const iframeDocument = cardElement.contentDocument || cardElement.contentWindow?.document;
  // 自动调整高度
  new MutationObserver(() => {
    cardElement.style.height = (iframeDocument.body.scrollHeight + 1) + "px"; // 有小数部分
  }).observe(iframeDocument, { childList: true, subtree: true });
  // 点击外围退出
  baseElement.addEventListener("click", e => {
    if (!cardElement.contains(e.target)) {
      baseElement.remove();
    }
  });

  function log(...msgs) {
    for (const msg of msgs) {
      console.log(msg);
      if (typeof msg === "string") {
        const e = document.createElement("span");
        e.innerHTML = msg;
        iframeDocument.body.append(...e.childNodes);
      }
      else {
        iframeDocument.body.append(msg);
      }
    }
    iframeDocument.body.scrollTo(0, iframeDocument.body.scrollHeight + 1)
  }

  function createCopyButton(textToCopy) {
    const copyButton = document.createElement("button");
    copyButton.textContent = "点击复制";
    copyButton.addEventListener("click", async e => {
      await navigator.clipboard.writeText(textToCopy);
      e.target.textContent = "已复制";
    });
    return copyButton;
  }

  baseElement.log = log;
  baseElement.createCopyButton = createCopyButton;
  return baseElement;
}