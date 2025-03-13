function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) {
    return getAllHtml();

    // 递归获取所有html
    function getAllHtml(iframeContent = "", frameContent = "") {
        const iframes = document.querySelectorAll("iframe");
        iframes.forEach(iframe => {
            const dom = iframe.contentWindow.document;
            iframeContent += getAllHtml(iframeContent, frameContent, dom);
        });
        const frames = document.querySelectorAll("frame");
        frames.forEach(frame => {
            const dom = frame.contentDocument.body.parentElement;
            frameContent += getAllHtml(iframeContent, frameContent, dom);
        });
        if (iframes.length === 0 && frames.length === 0) {
            return document.querySelector('body').outerHTML;
        }
        return document.querySelector('html').innerHTML + iframeContent + frameContent;
    }
}