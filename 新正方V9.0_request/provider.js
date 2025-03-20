/**
 * provider + parser + timer
 * @param {Document | string} [iframeContent] 获取的网页元素
 * @param {Document | string} [frameContent] 获取的网页元素
 * @param {Document | string} [dom] 获取的网页元素
 * @returns {string} 课表数组和providerRes参数
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) {
  // 输出提示栏
  const logFrame = await newLogFrame();
  const log = logFrame.log;
  const copyButton = logFrame.copyButton;
  const repoLink = logFrame.repoLink;

  log("开始导入<br />");

  if (!document.URL.includes("/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html")) {
    log("<b>导入失败</b><br />页面不正确, 请确保当前位于“学生课表查询”页面<br />");
    log(repoLink());
    return "do not continue";
  }

  log("获取请求参数<br />");
  const xnm = document.querySelector("#xnm")?.value;
  const xqm = document.querySelector("#xqm")?.value;
  const gnmkdm = document.querySelector("#gnmkdm")?.value;
  if (!xnm || !xqm || !gnmkdm) {
    log("<b>导入失败</b><br />获取不到请求参数<br />");
    log(repoLink());
    return "do not continue";
  }

  log("网络请求课表数据...<br />");
  let response;
  try {
    response = await fetch("/jwglxt/kbcx/xskbcx_cxXsgrkb.html", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "x-requested-with": "XMLHttpRequest"
      },
      body: new URLSearchParams({
        xnm: xnm, // 学年
        xqm: xqm, // 学期
        kzlx: "ck",
        xsdm: "",
        gnmkdm: gnmkdm, // document.querySelector("#cdNav").outerHTML.match(/(?<=clickMenu\().*?(?=\);)/g)?.find(v => v.includes("学生课表查询"))?.split(",")[0].slice(1, -1);
      }).toString(),
    });
  } catch (networkError) {
    log("<b>导入失败</b><br />网络请求失败, 错误信息: " + networkError.message + "<br />");
    log(repoLink());
    return "do not continue";
  }
  if (!response.ok) {
    log("<b>导入失败</b><br />网络请求失败, HTTP状态码: " + response.status + "<br />");
    log(repoLink());
    return "do not continue";
  }

  log("解析响应数据...<br />");
  let scheduleRawStr;
  try {
    scheduleRawStr = await response.text();
  } catch (parseError) {
    log("<b>导入失败</b><br />解析响应数据失败: " + parseError.message + "<br />");
    log(repoLink());
    return "do not continue";
  }

  log("获取到课表数据, 长度" + scheduleRawStr.length + " ", copyButton(scheduleRawStr), "<br />");

  // parser识别课表
  const parserRes = parserInProvider(scheduleRawStr, logFrame);
  if (parserRes === "do not continue") {
    log(repoLink());
    return "do not continue";
  }
  const courseInfos = parserRes.courseInfos;
  log(copyButton(JSON.stringify(courseInfos)), "<br />");

  // timer获取时间表
  const timetable = timerInProvider({ parserRes: parserRes }, logFrame);
  log(copyButton(JSON.stringify(timetable)), "<br />")

  log("<br />3秒后完成导入");
  await new Promise(e => setTimeout(e, 3000));
  log(repoLink());
  return JSON.stringify({ schedule: courseInfos, timetable: timetable }); // 导出给真正的parser.js和timer.js, parser.js和timer.js不做处理, 仅转发


  /**
   * 输出提示栏组件 需要有dom环境 请勿直接在此处修改函数内容
   * @version 0.3.143d203
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

    function copyButton(textToCopy) {
      const copyButton = document.createElement("button");
      copyButton.textContent = "点击复制";
      copyButton.addEventListener("click", async e => {
        await navigator.clipboard.writeText(textToCopy);
        e.target.textContent = "已复制";
      });
      return copyButton;
    }

    function repoLink() {
      const e = document.createElement("span");
      e.append("本适配项目的链接: ");
      e.append(copyButton("https://github.com/kqakqakqa/xiaoai-schedule-parser"));
      return e;
    }

    baseElement.log = log;
    baseElement.copyButton = copyButton;
    baseElement.repoLink = repoLink;
    return baseElement;
  }


  function isValidJson(str) {
    try {
      const obj = JSON.parse(str);
      return typeof obj === "object" && obj !== null;
    } catch (e) {
      return false;
    }
  }








  /**
   * parser
   * @param {string} scheduleRawStr 课表数组字符串
   * @param {Element} logFrame 输出提示栏
   * @returns {{
   *   courseInfos: {
   *     name: string,
   *     position: string,
   *     teacher: string,
   *     weeks: number[],
   *     day: number,
   *     sections: number[],
   *   }[],
   *   something
   * }} 课表数组
   */
  function parserInProvider(scheduleRawStr, logFrame = {}) {
    const log = logFrame.log ?? Function();
    const maxCourses = 150;

    log("识别课表<br />");

    if (!isValidJson(scheduleRawStr)) {
      log("<b>导入失败</b><br />未识别到课表<br />");
      return "do not continue";
    }
    const kbList = JSON.parse(scheduleRawStr).kbList;
    if (!Array.isArray(kbList)) {
      log("<b>导入失败</b><br />未识别到课表<br />");
      return "do not continue";
    }

    log("读取到" + kbList.length + "门课<br />");

    log("格式转换<br />");
    let courses = [];
    for (const course of kbList) {
      if (
        (course ?? null) === null ||
        (course.zcd ?? null) === null ||
        (course.xqj ?? null) === null ||
        (course.jcs ?? null) === null
      ) continue;
      courses.push({
        name: course.kcmc ?? "-", // 课程名称 (能不能是""?)
        position: course.cdmc ?? "-", // 上课地点
        teacher: course.xm ?? "-", // 教师姓名
        weeks: parseWeeks(course.zcd), // 课程周数
        day: course.xqj, // 课程所在星期
        sections: parseSections(course.jcs) // 课程节次
      });
    }
    log("转换了" + courses.length + "门课<br />");
    // console.log(coursesRaw);

    log("处理冲突课程<br />");
    const courses1 = coursesResolveConflicts(courses);
    log("处理后还有" + courses1.length + "门课<br />");
    // console.log(courses1);

    log("合并不同周的相同课程<br />");
    const courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
    log("合并后还有" + courses2.length + "门课<br />");
    // console.log(courses2);

    log("合并不同教师的相同课程<br />");
    const courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
    log("合并后还有" + courses3.length + "门课<br />");
    // console.log(courses3);

    log("合并不同教室的相同课程<br />");
    const courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
    log("合并后还有" + courses4.length + "门课<br />");
    // console.log(courses4);

    log("识别当前学期<br />");
    const countMap = {};
    for (const course of kbList) { // 统计各xqh_id出现次数
      countMap[course.xqh_id] = (countMap[course.xqh_id] ?? 0) + 1;
    };
    const [mostXqhId,] = Object.entries(countMap).sort(
      ([, value1], [, value2]) => (value2 - value1)
    )[0]; // 找到出现次数最多的xqh_id

    return { courseInfos: courses4, xqhId: mostXqhId };


    /**
     * 新正方周次解析 请勿直接在此处修改函数内容
     * @version 0.6.143d203
     * @param {string} weeksString eg: "4-6周(双),7-11周,13周"
     * @returns {number[]} eg: [4,6,7,8,9,10,11,13]
     */
    function parseWeeks(weeksString) { // unresolved: weeksString识别失败时的输出; 如果格式是"第1-5周,7周单,9-12周双"怎么办
      let weeks = [];
      const ranges = weeksString.split(/[,，]/); // eg: ["4-6周(双)",...]
      for (const rangeWithLabel of ranges) { // eg: "4-6周(双)"
        const [rangeString, oddEvenLabel] = rangeWithLabel.split("周"); // eg: ["4-6","(双)"]
        const range = rangeString.split("-"); // eg: ["4","6"]
        const start = parseInt(range[0]);
        const end = parseInt(range[1] ?? range[0]); // 只有一周就设置end为start
        const evenWeeks = (oddEvenLabel.includes("双") || !oddEvenLabel); // 双周 or 不分单双周
        const oddWeeks = (oddEvenLabel.includes("单") || !oddEvenLabel); // 单周 or 不分单双周
        for (let w = start; w <= end; w++) { // 填充 weeks 的 start-end 之间
          if ((!(w % 2) && evenWeeks) || ((w % 2) && oddWeeks)) weeks.push(w);
        }
      }
      return weeks;
    }

    /**
     * 新正方节次解析 请勿直接在此处修改函数内容
     * @version 0.5.02ba968
     * @param {string} sectionsString eg: "1-4"
     * @returns {number[]} eg: [1,2,3,4]
     */
    function parseSections(sectionsString) { // unresolved: sectionsString识别失败时的输出; 如果格式是"1-4节,6-8节"怎么办
      let sections = [];
      const range = sectionsString.replace(/节$/g, "").split("-"); // 以防万一存在"节"
      const start = parseInt(range[0]);
      const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
      for (let s = start; s <= end; s++) {
        sections.push(s);
      }
      return sections;
    }

    /* 通用课程表后处理 v local 请勿直接在此处修改函数内容 */

    function coursesResolveConflicts(courses) {
      const separator = "&";
      let coursesOrdered = [];
      let changePointsOrdered = [];
      for (const course of courses) {
        const weeks = course.weeks;
        const day = course.day;
        const sections = course.sections;
        for (const week of weeks) {
          if (!coursesOrdered[week]) coursesOrdered[week] = [];
          if (!coursesOrdered[week][day]) coursesOrdered[week][day] = [];
          for (const section of sections) {
            if (!coursesOrdered[week][day][section]) {
              coursesOrdered[week][day][section] = {
                name: course.name,
                position: course.position,
                teacher: course.teacher,
              };
            } else {
              coursesOrdered[week][day][section] = {
                name: "" + coursesOrdered[week][day][section].name + separator + course.name,
                position: "" + coursesOrdered[week][day][section].position + separator + course.position,
                teacher: "" + coursesOrdered[week][day][section].teacher + separator + course.teacher,
              };
            }
          }

          if (!changePointsOrdered[week]) changePointsOrdered[week] = [];
          if (!changePointsOrdered[week][day]) changePointsOrdered[week][day] = [];
          const changePoint = sections[0];
          const nextChangePoint = sections[sections.length - 1] + 1;
          changePointsOrdered[week][day].push(changePoint);
          changePointsOrdered[week][day].push(nextChangePoint);
          changePointsOrdered[week][day] = Array.from(new Set(changePointsOrdered[week][day])).sort((a, b) => (a - b));
        }
      }

      // console.log(coursesOrdered);
      // console.log(changePointsOrdered);

      let coursesNoConflict = [];
      for (let w = 1; w < coursesOrdered.length; w++) {
        if (!coursesOrdered[w]) continue;
        for (let d = 1; d < coursesOrdered[w].length; d++) {
          const changePointsDay = changePointsOrdered[w][d];
          if (!changePointsDay) continue;

          for (let ckpt = 0; ckpt < changePointsDay.length - 1; ckpt++) {
            let sections = [];
            const changePoint = changePointsOrdered[w][d][ckpt];
            const nextChangePoint = changePointsOrdered[w][d][ckpt + 1];
            // if (changePoint === nextChangePoint) continue;
            const courseOrdered = coursesOrdered[w][d][changePoint];
            if (!courseOrdered) continue;
            for (var s = changePoint; s < nextChangePoint; s++) {
              sections.push(s);
            }
            coursesNoConflict.push({
              name: courseOrdered.name,
              position: courseOrdered.position,
              teacher: courseOrdered.teacher,
              weeks: [w],
              day: d,
              sections: sections
            })
          }
        }
      }
      return coursesNoConflict;
    }

    function coursesMergeWeeks(courses) {
      let coursesNew = JSON.parse(JSON.stringify(courses));
      for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
          if (coursesNew[cc]
            && coursesNew[cc].name === coursesNew[c].name
            && coursesNew[cc].sections.length === coursesNew[c].sections.length
            && coursesNew[cc].sections[0].section === coursesNew[c].sections[0].section
            && coursesNew[cc].day === coursesNew[c].day
            && coursesNew[cc].position === coursesNew[c].position
            && coursesNew[cc].teacher === coursesNew[c].teacher) {
            // console.log("周合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c].weeks = coursesNew[c].weeks.concat(coursesNew[cc].weeks);
            coursesNew.splice(cc, 1);
            // console.log("合并后" + JSON.stringify(coursesNew[c]));
          }
        }
      }
      return coursesNew;
    }

    function coursesMergeTeachers(courses) {
      let coursesNew = JSON.parse(JSON.stringify(courses));
      for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
          if (coursesNew[cc]
            && coursesNew[cc].name === coursesNew[c].name
            && coursesNew[cc].sections.length === coursesNew[c].sections.length
            && coursesNew[cc].sections[0].section === coursesNew[c].sections[0].section
            && coursesNew[cc].day === coursesNew[c].day
            && coursesNew[cc].position === coursesNew[c].position) {
            // console.log("教师合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c].teacher = (coursesNew[c].teacher.match(/^[0-9,]{1,}周:/) ? coursesNew[c].teacher : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].teacher) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].teacher);
            coursesNew[c].weeks = coursesNew[c].weeks.concat(coursesNew[cc].weeks);
            coursesNew.splice(cc, 1);
            // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
          }
          if (coursesNew.length <= maxCourses) break;
        }
        if (coursesNew.length <= maxCourses) break;
      }
      return coursesNew;
    }

    function coursesMergeClassrooms(courses) {
      let coursesNew = JSON.parse(JSON.stringify(courses));
      for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
          if (coursesNew[cc]
            && coursesNew[cc].name === coursesNew[c].name
            && coursesNew[cc].sections.length === coursesNew[c].sections.length
            && coursesNew[cc].sections[0].section === coursesNew[c].sections[0].section
            && coursesNew[cc].day === coursesNew[c].day) {
            // console.log("教室合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c].position = (coursesNew[c].position.match(/^[0-9,]{1,}周:/) ? coursesNew[c].position : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].position) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].position);
            coursesNew[c].teacher = (coursesNew[c].teacher.match(/^[0-9,]{1,}周:/) ? coursesNew[c].teacher : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].teacher) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].teacher);
            coursesNew[c].weeks = coursesNew[c].weeks.concat(coursesNew[cc].weeks);
            coursesNew.splice(cc, 1);
            // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
          }
          if (coursesNew.length <= maxCourses) break;
        }
        if (coursesNew.length <= maxCourses) break;
      }
      return coursesNew;
    }
  }








  /**
   * timer
   * @param {{
   *   providerRes:string,
   *   parserRes:Object,
   * }} [res] 来自provider和parser的数据
   * @param {Element} logFrame 输出提示栏
   * @returns {{
   *   totalWeek: number,
   *   startSemester: string,
   *   startWithSunday: boolean,
   *   showWeekend: boolean,
   *   forenoon: number,
   *   afternoon: number,
   *   night: number,
   *   sections: {
   *     section: number,
   *     startTime: string,
   *     endTime: string,
   *   }[],
   * }} 时间表
   */
  async function timerInProvider({ providerRes, parserRes } = {}, logFrame = {}) {
    const log = logFrame.log ?? Function();
    const createCopyButton = logFrame.createCopyButton ?? Function();

    log("网络请求时间表数据...<br />");
    let response;
    try {
      response = await fetch("/jwglxt/kbcx/xskbcx_cxRjc.html", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        },
        body: new URLSearchParams({
          xnm,
          xqm,
          xqh_id: parserRes.xqhId, // 校区号
          gnmkdm
        }).toString(),
      });
    } catch (networkError) {
      log("网络请求失败, 错误信息: " + networkError.message + "<br />");
      return {};
    }
    if (!response.ok) {
      log("网络请求失败, HTTP状态码: " + response.status + "<br />");
      return {};
    }

    log("解析响应数据...<br />");
    let timetableRawStr;
    try {
      timetableRawStr = await response.text();
    } catch (parseError) {
      log("解析响应数据失败: " + parseError.message);
      return {};
    }
    log("获取到时间表数据, 长度" + timetableRawStr.length + " ", createCopyButton(timetableRawStr), "<br />");

    let timetable = {
      totalWeek: 30,
      startSemester: "",
      startWithSunday: false,
      showWeekend: true,
      forenoon: 0,
      afternoon: 0,
      night: 0,
      sections: [],
    };

    log("识别时间表<br />");

    if (!isValidJson(timetableRawStr)) {
      log("未识别到时间表<br />");
      return {};
    }
    const timetableRaw = JSON.parse(timetableRawStr);
    if (!Array.isArray(timetableRaw)) {
      log("未识别到时间表<br />");
      return {};
    }

    log("读取到" + timetableRaw.length + "节课<br />");

    log("格式转换<br />");
    for (const time of timetableRaw) {
      if (
        (time ?? null) === null ||
        (time.jcmc ?? null) === null ||
        (time.qssj ?? null) === null ||
        (time.jssj ?? null) === null
      ) continue;
      timetable.sections.push({
        section: parseInt(time.jcmc),
        startTime: time.qssj,
        endTime: time.jssj,
      });
      switch (time.rsdmc) {
        case "上午":
          timetable.forenoon++;
          break;
        case "下午":
          timetable.afternoon++;
          break;
        case "晚上":
          timetable.night++;
          break;
      }
    }
    log("转换了" + timetable.sections.length + "节课<br />");
    return timetable;
  }

}