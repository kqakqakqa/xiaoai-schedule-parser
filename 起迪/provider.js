/**
 * 基于模板_provider-only
 * @version 0.1.4cea65e
 * @param { Document | string } iframeContent 获取的网页元素
 * @param { Document | string } frameContent 获取的网页元素
 * @param { Document | string } dom 获取的网页元素
 * @returns { Promise< string > } 包含courses和timetable, 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) { // todo: 重复点击导入按钮

  const logFrame = (newLogFrame ? (await newLogFrame()) : undefined) ?? { log: Function(), copyButton: Function(), repoLink: Function() }; // 输出提示栏

  logFrame.log("开始导入<br />");

  if (!document.URL.includes("")) {
    logFrame.log("<b>导入失败</b><br />页面不正确<br /><br />", logFrame.repoLink());
    logFrame.log();
    return "do not continue";
  }

  /* 获取课程 */
  const iframeElement = document.querySelector("iframe#f_1");
  const coursesDocument = iframeElement?.contentDocument ?? iframeElement?.contentWindow?.document ?? document;
  const drpWeeksElement = coursesDocument?.querySelector("#drpWeeks");
  const drpWeeks = Array.from(drpWeeksElement.options).map(e => parseInt(e.value)).filter(v => v !== 0).sort((a, b) => a - b);
  const courses = [];
  let timestamp;
  for (const week of drpWeeks) {
    courses.push(...await getCoursesFromOneWeek(week));
  }

  async function getCoursesFromOneWeek(week) {
    logFrame.log("获取第" + week + "周数据...<br />");


    let response;
    try {
      response = await fetch("/StuClient/Tea/PKGL/KBCX/StuCourseSchedule.aspx", {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          "__VIEWSTATE": coursesDocument.querySelector("#__VIEWSTATE").value,
          "__VIEWSTATEGENERATOR": coursesDocument.querySelector("#__VIEWSTATEGENERATOR").value,
          "__EVENTVALIDATION": coursesDocument.querySelector("#__EVENTVALIDATION").value,
          "btnSearch": coursesDocument.querySelector("#btnSearch")?.value ?? "查询",
          "drpSemester": coursesDocument.querySelector("#drpSemester").value,
          "drpWeeks": week,
        }).toString(),
        method: "POST",
        credentials: "include",
      });
    } catch (networkError) {
      logFrame.log("<b>导入失败</b><br />网络请求失败, 错误信息: " + networkError.message + "<br />请确保教务系统已登录<br /><br />", logFrame.repoLink());
      return "do not continue";
    }
    if (!response.ok) {
      logFrame.log("<b>导入失败</b><br />网络请求失败, " + response.status + " " + response.statusText + "<br />请确保教务系统已登录<br /><br />", logFrame.repoLink());
      return "do not continue";
    }

    logFrame.log("解析响应数据...<br />");
    let responseStr;
    try {
      responseStr = await response.text();
    } catch (parseError) {
      logFrame.log("<b>导入失败</b><br />解析响应数据失败: " + parseError.message + "<br />请确保教务系统已登录<br /><br />", logFrame.repoLink());
      return "do not continue";
    }

    logFrame.log("获得第" + week + "周数据, 长度" + responseStr.length + " ", logFrame.copyButton(responseStr), "<br />");

    logFrame.log("识别第" + week + "周数据<br />");
    const doc = new DOMParser().parseFromString(responseStr, 'text/html');
    const coursesRaw = doc.querySelector("#dvReport").querySelectorAll(".pkScheduleTime");


    const courses = [];
    for (const courseRaw of coursesRaw) {
      console.log(courseRaw)
      if (courseRaw?.innerText?.replace(/\s/g, "") === "") continue;

      const name = courseRaw.childNodes[0]?.nodeValue?.trim() ?? "-";
      const teacher = courseRaw.querySelectorAll(".scheduleWeek")[0]?.innerText.trim() ?? "";
      const position = courseRaw.querySelectorAll(".scheduleWeek")[1]?.innerText.trim() ?? "";
      const idParts = courseRaw.id.match(/node_(\d+)_(\d+)/);
      const day = parseInt(idParts[1]);
      const startSection = parseInt(idParts[2]);
      const rowspan = parseInt(courseRaw.getAttribute("rowspan")) || 1;
      const sections = [];
      for (let i = 0; i < rowspan; i++) {
        sections.push(startSection + i);
      }

      courses.push({
        name: name,
        position: position,
        teacher: teacher,
        weeks: [week],
        day: day,
        sections: sections,
      });

    }
    logFrame.log("第" + week + "周共" + courses.length + "门课 ", logFrame.copyButton(courses), "<br />");

    // 顺便获取学期开始时间
    if (week === 1) {
      try {
        const date = new Date(doc.querySelectorAll(".pkScheduleWeek")[0].childNodes[2].nodeValue.trim());  // 创建日期对象
        date.setDate(date.getDate() - 1);
        timestamp = date.getTime().toString();
      } catch (err) {
        logFrame.log(err.message);
      }
    }

    return courses;
  }

  logFrame.log("共" + courses.length + "门课 ", logFrame.copyButton(JSON.stringify(courses)), "<br />");

  /* 课程后处理 */
  const postProcessings = coursesPostProcessings();
  const maxCourses = 150;

  logFrame.log("处理冲突课程...");
  const courses1 = postProcessings.mergeConflictsAndDuplicates(courses);
  logFrame.log("处理后还有" + courses1.length + "门课 ", logFrame.copyButton(JSON.stringify(courses1)), "<br />");

  logFrame.log("合并不同周数的相同课程...");
  const courses2 = postProcessings.mergeWeeks(courses1);
  logFrame.log("合并后还有" + courses2.length + "门课 ", logFrame.copyButton(JSON.stringify(courses2)), "<br />");

  let courses3 = courses2;
  if (courses2.length > maxCourses) {
    logFrame.log("合并不同教师/教室的相同课程...");
    courses3 = postProcessings.mergeTeachersOrPositions(courses2, mergePositions = true, mergeTeachers = true);
    logFrame.log("合并后还有" + courses3.length + "门课 ", logFrame.copyButton(JSON.stringify(courses3)), "<br />");
  }

  /* 获取时间表 */
  const timetable = {
    totalWeek: drpWeeks[drpWeeks.length - 1],
    startSemester: timestamp,
    forenoon: 4,
    afternoon: 4,
    night: 2,
    sections: [
      { section: 1, startTime: '08:40', endTime: '09:25' },
      { section: 2, startTime: '09:25', endTime: '10:05' },
      { section: 3, startTime: '10:20', endTime: '11:00' },
      { section: 4, startTime: '11:05', endTime: '11:45' },
      { section: 5, startTime: '14:30', endTime: '15:10' },
      { section: 6, startTime: '15:15', endTime: '15:55' },
      { section: 7, startTime: '16:10', endTime: '16:50' },
      { section: 8, startTime: '16:55', endTime: '17:35' },
      { section: 9, startTime: '19:30', endTime: '20:10' },
      { section: 10, startTime: '20:15', endTime: '20:55' },
    ],
  };

  // const timetable = {
  //   totalWeek: 1, // 总周数：[1, 30]之间的整数
  //   startSemester: '', // 开学时间：时间戳，13位长度字符串，推荐用代码生成
  //   startWithSunday: false, // 是否是周日为起始日，该选项为true时，会开启显示周末选项
  //   showWeekend: true, // 是否显示周末
  //   forenoon: 1, // 上午课程节数：[1, 10]之间的整数
  //   afternoon: 1, // 下午课程节数：[0, 10]之间的整数
  //   night: 1, // 晚间课程节数：[0, 10]之间的整数
  //   sections: [
  //   {
  //     section: 1,
  //     startTime: "08:00",
  //     endTime: "12:00",
  //   },
  //   {
  //     section: 2,
  //     startTime: "12:00",
  //     endTime: "16:00",
  //   },
  //   {
  //     section: 3,
  //     startTime: "16:00",
  //     endTime: "20:00",
  //   }
  //   ], // 课程时间表，注意：总长度要和上边配置的节数加和对齐
  // };

  /* 完成导入 */
  logFrame.log("<br />", logFrame.repoLink(), "<br />");
  logFrame.log("3秒后完成导入...");
  await new Promise(e => setTimeout(e, 3000));
  return JSON.stringify({ courses: courses3, timetable: timetable }); // 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发








  /**
   * 输出提示栏 需要有dom环境
   * @version 0.5.5b94389
   */
  async function newLogFrame() {
    // 粘贴到此处
  }


  /**
     * 通用课程后处理
     * @version 0.12.7f27d73
     */
  function coursesPostProcessings() {
    // 粘贴到此处
  }

}