/* provider */
async function scheduleHtmlProvider() {
  let ajaxForm = document.querySelector("#ajaxForm");
  let messages = document.createElement("div");
  ajaxForm.append(messages);
  function LogToUser(msg) {
    console.log(msg);
    messages.innerHTML += msg.replaceAll("\n", "<br />");
  }
  LogToUser("开始获取课表\n");

  LogToUser("获取网页内容...");
  const html = getAllHtml();
  LogToUser("完成！长度" + html.length + "<button id='copyScheduleHtml'>点击复制</button>\n");
  document.querySelector("#copyScheduleHtml").onclick = async () => await navigator.clipboard.writeText(html);

  LogToUser("识别课程表...");
  const parsed = scheduleHtmlParser(html, LogToUser); // return html;
  LogToUser("完成！共" + JSON.parse(parsed).length + "节课<button id='copySchedule'>点击复制</button>\n\n");
  document.querySelector("#copySchedule").onclick = async () => await navigator.clipboard.writeText(parsed);
  
  LogToUser("3秒后进入下一步");
  await new Promise(e => setTimeout(e, 3000));
  return parsed;

  /* 递归获取所有html v0.1.kqa*/
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

  /* parser */
  function scheduleHtmlParser(html) {
    let result = parseTable(html);
    return { courseInfos: result }

    // 解析表格模式
    function parseTable(html) {
      const $ = cheerio.load(html, { decodeEntities: false });
      let result = []
      $('#kbgrid_table_0').find('td').each(function () {
        if ($(this).hasClass('td_wrap') && $(this).text().trim() !== '') {
          let info = []
          let weekday = parseInt($(this).attr('id').split('-')[0])
          $(this).find('font').each(function () {
            let text = $(this).text().trim()
            if (text !== '') {
              info.push(text)
            }
          })
          console.log(info)
          let hasNext = true
          let index = 0
          while (hasNext) {
            let course = {}
            course.name = info[index]
            course.teacher = info[index + 3]
            course.position = info[index + 2]
            course.day = weekday
            if (info[index + 1]) {
              if (info[index + 1].split('节)')[1]) {
                let [weeks, sections] = getTime(info[index + 1])
                course.weeks = weeks
                course.sections = sections
                result.push(course)
              }
            }
            if (info[index + 11] !== undefined) {
              index += 11
            } else {
              hasNext = false
            }
          }
        }
      })
      return result

      function getTime(str) {
        let t = str.split('节)')
        let weekStr = t[1].replace(/周/g, '');
        let weeks = parseWeeks(weekStr)
        return [weeks, parseSections(t[0].replace('(', ''))]
      }
    }

    /**
     * 新正方周次解析 v0.3.kqa
     * @param {string} weeksString eg: "4-6周(双),7-11周,13周"
     * @returns {number[]} eg: [4,6,7,8,9,10,11,13]
     */
    function parseWeeks(weeksString) {
      let weeks = [];
      const weeksStringArray = weeksString.split(/[,，]/); // eg: ["4-6周(双)",...]
      for (const weekRangeString of weeksStringArray) { // eg: "4-6周(双)"
        const weekRangeStringSplit = weekRangeString.split("周"); // eg: ["4-6","(双)"]
        const weekRange = weekRangeStringSplit[0].split("-"); // eg: ["4","6"]
        const weekStart = parseInt(weekRange[0]);
        const weekEnd = parseInt(weekRange[1] ?? weekRange[0]); // 只有一周就设置end为start
        const evenWeeks = (weekRangeStringSplit[1] === "(双)" || !weekRangeStringSplit[1]); // 双周 or 不分单双周
        const oddWeeks = (weekRangeStringSplit[1] === "(单)" || !weekRangeStringSplit[1]); // 单周 or 不分单双周
        for (let w = weekStart; w <= weekEnd; w++) { // 填充 weeks 的 start-end 之间
          if ((!(w % 2) && evenWeeks) || ((w % 2) && oddWeeks)) weeks.push(w);
        }
      }
      return weeks;
    }

    /**
     * 新正方节次解析 v0.2.kqa
     * @param {string} sectionsString eg: "1-4"
     * @returns {object[]} eg: [{ "section": 1 }, { "section": 2 }, { "section": 3 }, { "section": 4 }]
     */
    function parseSections(sectionsString) { // 
      let sections = [];
      const range = sectionsString.split("-");
      const start = parseInt(range[0]);
      const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
      for (let s = start; s <= end; s++) {
        sections.push({ "section": s });
      }
      return sections;
    }
  }
}