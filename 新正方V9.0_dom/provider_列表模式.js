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
  function scheduleHtmlParser(html, LogToUser) { // todo: 连跨四个时间段的大课可能会只识别成两个
    let result = [];
    LogToUser("解析" + kbList.length + "网页内容...\n");
    const $ = cheerio.load(html, { decodeEntities: false });
    // 列表模式，无需手动切换
    const infos = $(html).find("#kblist_table > tbody:nth-child(n+2) > tr:nth-child(n+2) > td"); // 获取所有<td>，分星期&节次信息和课程信息两种
    LogToUser("完成！\n格式转换...");
    let currentDay, currentSections;
    for (const info of infos) { // 星期&节次信息: id="jc_1-1-3", 课程信息: 无id
      // 星期&节次信息
      if ($(info).attr("id") !== undefined) {
        // 更新星期&节次记忆
        currentDay = parseInt($(info).attr("id").split(/[_-]/)[1]);
        currentSections = parseSections($(info).text().replace(/^ *| *$/g, ""));
        continue;
      }
      // 课程信息
      const courseName = $(info).find(".title").first().text().replace(/^ *| *$/g, "");
      const weeks = parseWeeks($(info).find(".timetable_con > p > font:nth-child(1)").first().text().replace(/周数 *[:：] *|^ *| *$/g, ""));
      const positionRaw = $(info).find(".timetable_con > p > font:nth-child(2)").first().text().replace(/^ *| *$/g, "");
      const position = positionRaw.replace(/校区 *[:：] *|上课地点 *[:：]|^ *| *$/g, "");
      const teacher = $(info).find(".timetable_con > p > font:nth-child(3)").first().text().replace(/教师 *[:：]|^ *| *$/g, "");
      //整合，输出
      result.push({
        name: courseName,
        position: position,
        teacher: teacher,
        weeks: weeks,
        day: currentDay,
        sections: currentSections,
      });
    }
    LogToUser("完成！转换了" + result.length + "节课\n");
    // console.log(result);

    LogToUser("处理冲突课程...");
    const courses1 = coursesResolveConflicts(result);
    LogToUser("完成！处理后还有" + courses1.length + "节课\n");
    // console.log(courses1);

    LogToUser("合并不同周的相同课程...");
    const courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
    LogToUser("完成！合并后还有" + courses2.length + "节课\n");
    // console.log(courses2);

    LogToUser("合并不同教师的相同课程...");
    const courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
    LogToUser("完成！合并后还有" + courses3.length + "节课\n");
    // console.log(courses3);

    LogToUser("合并不同教室的相同课程...");
    const courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
    LogToUser("完成！合并后还有" + courses4.length + "节课\n");
    // console.log(courses4);

    return JSON.stringify(courses4);

    /**
     * 新正方周次解析 请勿直接在此处修改函数内容
     * @version 0.5.02ba968
     * @param {string} weeksString eg: "4-6周(双),7-11周,13周"
     * @returns {number[]} eg: [4,6,7,8,9,10,11,13]
     */
    function parseWeeks(weeksString) { // todo: weeksString识别失败时的输出; 如果格式是"第1-5周,7周单,9-12周双"怎么办
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
    function parseSections(sectionsString) { // todo: sectionsString识别失败时的输出; 如果格式是"1-4节,6-8节"怎么办
      let sections = [];
      const range = sectionsString.replace(/节$/g, "").split("-"); // 以防万一存在"节"
      const start = parseInt(range[0]);
      const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
      for (let s = start; s <= end; s++) {
        sections.push(s);
      }
      return sections;
    }

    /* 通用课程表后处理 v0.2.kqa */

    function coursesResolveConflicts(courses) {
      let coursesOrdered = [];
      let changePointsOrdered = [];
      for (const course of courses) {
        const weeks = course["weeks"];
        const day = course["day"];
        const sections = course["sections"];
        for (const week of weeks) {
          if (!coursesOrdered[week]) coursesOrdered[week] = [];
          if (!coursesOrdered[week][day]) coursesOrdered[week][day] = [];
          for (const section of sections) {
            if (!coursesOrdered[week][day][section]) {
              coursesOrdered[week][day][section] = {
                name: course["name"],
                position: course["position"],
                teacher: course["teacher"]
              };
            }
            else {
              coursesOrdered[week][day][section] = {
                name: `${coursesOrdered[week][day][section]["name"]}&${course["name"]}`,
                position: `${coursesOrdered[week][day][section]["position"]}&${course["position"]}`,
                teacher: `${coursesOrdered[week][day][section]["teacher"]}&${course["teacher"]}`
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
              name: courseOrdered["name"],
              position: courseOrdered["position"],
              teacher: courseOrdered["teacher"],
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
            && coursesNew[cc]["name"] === coursesNew[c]["name"]
            && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
            && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
            && coursesNew[cc]["day"] === coursesNew[c]["day"]
            && coursesNew[cc]["position"] === coursesNew[c]["position"]
            && coursesNew[cc]["teacher"] === coursesNew[c]["teacher"]) {
            // console.log("周合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
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
            && coursesNew[cc]["name"] === coursesNew[c]["name"]
            && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
            && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
            && coursesNew[cc]["day"] === coursesNew[c]["day"]
            && coursesNew[cc]["position"] === coursesNew[c]["position"]) {
            // console.log("教师合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c]["teacher"] = (coursesNew[c]["teacher"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["teacher"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["teacher"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["teacher"]);
            coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
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
            && coursesNew[cc]["name"] === coursesNew[c]["name"]
            && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
            && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
            && coursesNew[cc]["day"] === coursesNew[c]["day"]) {
            // console.log("教室合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
            coursesNew[c]["position"] = (coursesNew[c]["position"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["position"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["position"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["position"]);
            coursesNew[c]["teacher"] = (coursesNew[c]["teacher"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["teacher"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["teacher"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["teacher"]);
            coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
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
}