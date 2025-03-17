/**
 * provider
 * @param {Document | string} [iframeContent] 获取的网页元素
 * @param {Document | string} [frameContent] 获取的网页元素
 * @param {Document | string} [dom] 获取的网页元素
 * @returns {string} 课程表数组和providerRes参数
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) {


  /* 输出提示栏 */
  const logFrame = await newLogFrame();

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
      return [...document.querySelectorAll('*')].reduce((r, e) => Math.max(r, +window.getComputedStyle(e).zIndex || 0), 0) || 1
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
      cardElement.style.height = (iframeDocument.body.scrollHeight + 1) + 'px'; // 有小数部分
    }).observe(iframeDocument, { childList: true, subtree: true });
    // 点击外围退出
    baseElement.addEventListener("click", e => {
      if (!cardElement.contains(e.target)) {
        baseElement.remove();
      }
    });

    function logToUser(msg) {
      console.log(msg);
      if (typeof msg === "string") {
        const element = document.createElement("div");
        element.innerHTML = msg;
        iframeDocument.body.append(...element.childNodes);
      }
      else {
        iframeDocument.body.append(msg);
      }
      iframeDocument.body.scrollTo(0, iframeDocument.body.scrollHeight + 1)
    }

    baseElement.logToUser = logToUser;
    return baseElement;
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


  /* 导入 */
  if (!document.URL.includes("jwglxt/kbcx/xskbcx_cxXskbcxIndex.html")) {
    logFrame.logToUser("请确保当前位于【学生课表查询】页面<br />");
    return "do not continue";
  }
  logFrame.logToUser("开始导入<br />");

  logFrame.logToUser("请求课表数据（fetch）...");
  const providerRes_schedule = await (await fetch("/jwglxt/kbcx/xskbcx_cxXsgrkb.html", { // "/jwglxt/kbcx/xskbcxMobile_cxXsKb.html"
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    body: new URLSearchParams({ // unresolved: 获取失败时的处理
      xnm: document.querySelector("#xnm").value, // 学年
      xqm: document.querySelector("#xqm").value, // 学期
      kzlx: "ck",
      xsdm: "",
      gnmkdm: document.querySelector("#gnmkdm").value, // document.querySelector("#cdNav").outerHTML.match(/(?<=clickMenu\().*?(?=\);)/g)?.find(v => v.includes("学生课表查询"))?.split(",")[0].slice(1, -1);
    }).toString(),
  })).text();
  logFrame.logToUser("完成！长度" + providerRes_schedule.length);
  logFrame.logToUser(createCopyButton(providerRes_schedule));
  logFrame.logToUser("<br />");

  logFrame.logToUser("识别课程表...");
  const parserRes = parserInProvider(providerRes_schedule, logFrame.logToUser);
  logFrame.logToUser("完成！共" + parserRes.length + "门课");
  logFrame.logToUser(createCopyButton(JSON.stringify(parserRes)));
  logFrame.logToUser("<br />");

  logFrame.logToUser("请求时间表数据（fetch）...");
  const providerRes_timetable = await (await fetch("/jwglxt/kbcx/xskbcx_cxRjc.html", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "x-requested-with": "XMLHttpRequest"
    },
    body: new URLSearchParams({ // unresolved: 获取失败时的处理
      xnm: document.querySelector("#xnm").value, // 学年
      xqm: document.querySelector("#xqm").value, // 学期
      xqh_id: getXqhId(providerRes_schedule), // 校区号
      gnmkdm: document.querySelector("#gnmkdm").value,
    }).toString(),
  })).text();
  logFrame.logToUser("完成！长度" + providerRes_timetable.length);
  logFrame.logToUser(createCopyButton(providerRes_timetable));
  logFrame.logToUser("<br />");

  logFrame.logToUser("识别时间表...");
  const timerRes = timerInProvider({ providerRes: providerRes_timetable }, logFrame.logToUser);
  if (timerRes?.sections) { logFrame.logToUser("完成！共" + timerRes.sections.length + "节课"); }
  else { logFrame.logToUser("完成！时间表为空，使用默认配置"); }
  logFrame.logToUser(createCopyButton(JSON.stringify(timerRes)));
  logFrame.logToUser("<br />");

  logFrame.logToUser("<br />3秒后完成导入");
  await new Promise(e => setTimeout(e, 3000));
  return JSON.stringify({ schedule: parserRes, timetable: timerRes });

  function getXqhId(jsonString) { // unresolved: jsonString为非预期内容(如空字符串或html格式报错)时的处理, 同下parserInProvider
    const kbList = JSON.parse(jsonString).kbList; // 从课表中获取xqh_id
    const countMap = {};
    for (const course of kbList) { // 统计各xqh_id出现次数
      countMap[course.xqh_id] = (countMap[course.xqh_id] ?? 0) + 1;
    };
    const [maxXqhId,] = Object.entries(countMap).sort(
      ([, value1], [, value2]) => (value2 - value1)
    )[0]; // 找到出现次数最多的xqh_id
    return maxXqhId;
  }


  /**
   * parser
   * @param {string} jsonString 课程表数组字符串
   * @param {function} logToUser 输出函数
   * @returns {{
   *   name: string,
   *   position: string,
   *   teacher: string,
   *   weeks: number[],
   *   day: number,
   *   sections: number[],
   * }[]} 课程表数组
   */
  function parserInProvider(jsonString, logToUser) {
    const maxCourses = 150;
    const kbList = JSON.parse(jsonString).kbList; // unresolved: jsonString为非预期内容(如空字符串或html格式报错)时的处理
    logToUser("读取到" + kbList.length + "门课<br />");
    // console.log(kbList)

    logToUser("格式转换...");
    let courses = [];
    for (const course of kbList) { // unresolved: course为非预期类型(如null)时的处理
      courses.push({
        name: course.kcmc ?? "-", // 课程名称 // unresolved: 能不能是""?
        position: course.cdmc ?? "-", // 上课地点
        teacher: course.xm ?? "-", // 教师姓名
        weeks: parseWeeks(course.zcd), // 上课周次（第几周）
        day: course.xqj, // 星期几（的周几）
        sections: parseSections(course.jcs) // 上课节次（的第几节）
      });
    }
    logToUser("完成！转换了" + courses.length + "门课<br />");
    // console.log(coursesRaw);

    logToUser("处理冲突课程..."); // unresolved: course1~course4有效性检验, 是否非预期值?
    const courses1 = coursesResolveConflicts(courses);
    logToUser("完成！处理后还有" + courses1.length + "门课<br />");
    // console.log(courses1);

    logToUser("合并不同周的相同课程...");
    const courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
    logToUser("完成！合并后还有" + courses2.length + "门课<br />");
    // console.log(courses2);

    logToUser("合并不同教师的相同课程...");
    const courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
    logToUser("完成！合并后还有" + courses3.length + "门课<br />");
    // console.log(courses3);

    logToUser("合并不同教室的相同课程...");
    const courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
    logToUser("完成！合并后还有" + courses4.length + "门课<br />");
    // console.log(courses4);

    return courses4;

    /**
     * 新正方周次解析 请勿直接在此处修改函数内容
     * @version 0.5.02ba968
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
        const evenWeeks = (oddEvenLabel === "(双)" || !oddEvenLabel); // 双周 or 不分单双周
        const oddWeeks = (oddEvenLabel === "(单)" || !oddEvenLabel); // 单周 or 不分单双周
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
            }
            else {
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
   * @param {function} logToUser 输出函数
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
  function timerInProvider({ providerRes, parserRes } = {}, logToUser) {
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
    const providerRes_timetable = JSON.parse(providerRes);
    logToUser("读取到" + providerRes_timetable.length + "节课<br />");
    logToUser("格式转换...");
    for (const time of providerRes_timetable) {
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
    logToUser("完成！转换了" + timetable.sections.length + "节课<br />");
    return timetable;
  }
}