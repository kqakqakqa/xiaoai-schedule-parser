/**
 * provider + parser + timer
 * @param { Document | string } iframeContent 获取的网页元素
 * @param { Document | string } frameContent 获取的网页元素
 * @param { Document | string } dom 获取的网页元素
 * @returns { Promise< string > } 包含课程数组和其他自定义属性, 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) { // todo: 重复点击导入按钮
  /* 导入流程开始 */

  const logFrame = (await newLogFrame()) ?? { log: Function(), copyButton: Function(), repoLink: Function() }; // 输出提示栏

  logFrame.log("开始导入<br />");

  if (!document.URL.includes("/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html")) {
    logFrame.log("<b>导入失败</b><br />页面不正确, 请确保当前位于“学生课表查询”页面<br />");
    logFrame.log(logFrame.repoLink());
    return "do not continue";
  }

  logFrame.log("获取请求参数<br />");
  const xnm = document.querySelector("#xnm")?.value ?? document.querySelector("#xnm_hide")?.value; // 学年
  const xqm = document.querySelector("#xqm")?.value ?? document.querySelector("#xqm_hide")?.value; // 学期
  const gnmkdm = document.querySelector("#gnmkdm")?.value ?? "N2151"; // todo: document.querySelector("#cdNav").outerHTML.match(/(?<=clickMenu\().*?(?=\);)/g)?.find(v => v.includes("学生课表查询"))?.split(",")[0].slice(1, -1);
  if (!xnm || !xqm || !gnmkdm) {
    logFrame.log("<b>导入失败</b><br />获取不到请求参数<br />");
    logFrame.log(logFrame.repoLink());
    return "do not continue";
  }

  logFrame.log("网络请求课程数据...<br />");
  let response;
  try {
    response = await fetch("/jwglxt/kbcx/xskbcx_cxXsgrkb.html", { // todo: 网址可能是"https://webvpn.example.edu.cn/http/.../jwglxt/kbcx/xskbcx_cxXsgrkb.html", "/jwglxt/kbcx/xskbcxMobile_cxXsKb.html"
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "x-requested-with": "XMLHttpRequest"
      },
      body: new URLSearchParams({
        xnm: xnm,
        xqm: xqm,
        kzlx: "ck",
        xsdm: "",
        gnmkdm: gnmkdm,
      }).toString(),
    });
  } catch (networkError) {
    logFrame.log("<b>导入失败</b><br />网络请求失败, 错误信息: " + networkError.message + "<br />请确保教务系统已登录<br />"); // todo: 尝试切换到班级课表? "/jwglxt/kbdy/bjkbdy_cxBjkbdyIndex.html?gnmkdm=N214505&layout=default"
    logFrame.log(logFrame.repoLink());
    return "do not continue";
  }
  if (!response.ok) {
    logFrame.log("<b>导入失败</b><br />网络请求失败, " + response.status + " " + response.statusText + "<br />请确保教务系统已登录<br />");
    logFrame.log(logFrame.repoLink());
    return "do not continue";
  }

  logFrame.log("解析响应数据...<br />");
  let coursesRawStr;
  try {
    coursesRawStr = await response.text();
  } catch (parseError) {
    logFrame.log("<b>导入失败</b><br />解析响应数据失败: " + parseError.message + "<br />请确保教务系统已登录<br />");
    logFrame.log(logFrame.repoLink());
    return "do not continue";
  }

  logFrame.log("获取到课程数据, 长度" + coursesRawStr.length + " ", logFrame.copyButton(coursesRawStr), "<br />");

  // parser识别课程
  const parserRes = await parserInProvider(coursesRawStr, logFrame);
  if (parserRes === "do not continue") {
    return "do not continue";
  }
  const courses = parserRes.courseInfos;
  logFrame.log(logFrame.copyButton(JSON.stringify(courses)), "<br />");

  // timer获取时间表
  const timetable = await timerInProvider({ parserRes: parserRes }, logFrame);
  logFrame.log(logFrame.copyButton(JSON.stringify(timetable)), "<br />")

  logFrame.log(logFrame.repoLink(), "<br />");
  logFrame.log("<br />3秒后完成导入...");
  await new Promise(e => setTimeout(e, 3000));
  return JSON.stringify({ courses: courses, timetable: timetable }); // 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发

  /* 导入流程结束 */


  /**
   * 输出提示栏组件 需要有dom环境
   * @version 0.4.2a6f14e
   */
  async function newLogFrame() {
    // 粘贴到此处
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
   * @param { string } coursesRawStr 课程数据字符串
   * @param { Element } logFrame 输出提示栏
   * @returns { Promise< {
   *   courseInfos: {
   *     name: string,
   *     position: string,
   *     teacher: string,
   *     weeks: number[],
   *     day: number,
   *     sections: number[],
   *   }[],
   *   something,
   * } > } 课程数组
   */
  async function parserInProvider(coursesRawStr, logFrame = { log: Function(), copyButton: Function(), repoLink: Function() }) { // todo: 可能要处理调课
    const maxCourses = 150;

    logFrame.log("识别课程数据<br />");

    if (!isValidJson(coursesRawStr)) {
      logFrame.log("<b>导入失败</b><br />未识别到课程数据<br />请确保教务系统已登录<br />");
      logFrame.log(logFrame.repoLink());
      return "do not continue";
    }
    const kbList = JSON.parse(coursesRawStr).kbList;
    if (!Array.isArray(kbList)) {
      logFrame.log("<b>导入失败</b><br />未识别到课程数据<br />请确保教务系统已登录<br />");
      logFrame.log(logFrame.repoLink());
      return "do not continue";
    }

    logFrame.log("读取到" + kbList.length + "门课<br />");

    logFrame.log("格式转换<br />");
    const courses = [];
    const countMap = {}; // 顺便统计当前学期
    for (const course of kbList) {
      if (
        !course ||
        typeof course?.zcd !== "string" ||
        typeof course?.xqj !== "string" ||
        typeof course?.jcs !== "string"
      ) continue;

      const weeks = parseWeeks(course.zcd);
      const sections = parseSections(course.jcs);

      if (
        !Array.isArray(weeks) ||
        !Array.isArray(sections) ||
        weeks.length === 0 ||
        sections.length === 0
      ) continue;

      courses.push({
        name: course.kcmc ?? "-", // 课程名称 (能不能是""?)
        position: course.cdmc ?? "-", // 上课地点
        teacher: course.xm ?? "-", // 教师姓名
        weeks: weeks, // 课程周数
        day: course.xqj, // 课程所在星期
        sections: sections // 课程节次
      });

      const xqhId = course?.xqh_id;
      countMap[xqhId] = (countMap[xqhId] ?? 0) + 1;
    }
    logFrame.log("转换了" + courses.length + "门课<br />");
    if (kbList.length > courses.length) {
      logFrame.log("<b>可能有部分课程识别失败了，请注意检查: </b>", logFrame.copyButton(JSON.stringify(courses)), "<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
    }

    // 课程后处理
    const postProcessings = getPostProcessings();

    logFrame.log("处理冲突课程<br />");
    const courses1 = postProcessings.resolveConflicts(courses);
    logFrame.log("处理后还有" + courses1.length + "门课<br />");

    logFrame.log("处理冲突课程<br />");
    const courses2 = postProcessings.resolveConflicts(courses1);
    logFrame.log("处理后还有" + courses2.length + "门课<br />");

    logFrame.log("合并不同周的相同课程<br />");
    const courses3 = postProcessings.mergeWeeks(courses2); // 合并不同周的相同课程
    logFrame.log("合并后还有" + courses3.length + "门课<br />");

    logFrame.log("合并不同教师/教室的相同课程<br />");
    const courses4 = (courses3.length > maxCourses) ? postProcessings.mergeTeachersOrPositions(courses3, mergePositions = true, mergeTeachers = true) : courses3; //如果课太多，就合并不同教室的相同课程
    logFrame.log("合并后还有" + courses4.length + "门课<br />");

    logFrame.log("识别当前学期<br />");
    const [mostXqhId,] = Object.entries(countMap).sort(
      ([, value1], [, value2]) => (value2 - value1)
    )[0]; // 找到出现次数最多的xqhId. 就算是"undefined"也没关系

    return { courseInfos: courses4, xqhId: mostXqhId };


    /**
     * 新正方周次解析
     * @version 0.7.2a6f14e
     * @param { string } weeksString eg. "4-6周(双),7-11周,13周"
     * @returns { number[] } eg. [4,6,7,8,9,10,11,13]
     */
    function parseWeeks(weeksString) {
      // 粘贴到此处
    }

    /**
     * 新正方节次解析
     * @version 0.6.2a6f14e
     * @param { string } sectionsString eg. "1-4"
     * @returns { number[] } eg. [1,2,3,4]
     */
    function parseSections(sectionsString) {
      // 粘贴到此处
    }

    /**
     * 通用课程后处理
     * @version 0.5.2a6f14e
     */
    function getPostProcessings({ maxCourses = Infinity }) {
      // 粘贴到此处
    }

  }








  /**
   * timer
   * @param { {
   *   providerRes: string,
   *   parserRes: {
   *     courseInfos: {
   *       name: string,
   *       position: string,
   *       teacher: string,
   *       weeks: number[],
   *       day: number,
   *       sections: number[],
   *     }[],
   *   something,
   *   },
   * } } res 来自provider和parser的数据
   * @param { Element } logFrame 输出提示栏
   * @returns { Promise< {
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
   * } > } 时间表
   */
  async function timerInProvider({ providerRes, parserRes } = {}, logFrame = { log: Function(), copyButton: Function(), repoLink: Function() }) {
    // return {
    //   totalWeek: 1, // 总周数：[1, 30]之间的整数
    //   startSemester: '', // 开学时间：时间戳，13位长度字符串，推荐用代码生成
    //   startWithSunday: false, // 是否是周日为起始日，该选项为true时，会开启显示周末选项
    //   showWeekend: true, // 是否显示周末
    //   forenoon: 1, // 上午课程节数：[1, 10]之间的整数
    //   afternoon: 1, // 下午课程节数：[0, 10]之间的整数
    //   night: 1, // 晚间课程节数：[0, 10]之间的整数
    //   sections: [
    //     {
    //       section: 1,
    //       startTime: "08:00",
    //       endTime: "12:00",
    //     },
    //     {
    //       section: 2,
    //       startTime: "12:00",
    //       endTime: "16:00",
    //     },
    //     {
    //       section: 3,
    //       startTime: "16:00",
    //       endTime: "20:00",
    //     }
    //   ], // 课程时间表，注意：总长度要和上边配置的节数加和对齐
    // };

    logFrame.log("网络请求时间表数据...<br />");
    let response;
    try {
      response = await fetch("/jwglxt/kbcx/xskbcx_cxRjc.html", { // todo: 网址可能是"/jzgl/skxxMobile_cxRsdjc.html", "/jwglxt/jzgl/skxxMobile_cxRsdjc.html", "/kbcx/xskbcx_cxRjc.html"
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
      logFrame.log("网络请求失败, 错误信息: " + networkError.message + "<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }
    if (!response.ok) {
      logFrame.log("网络请求失败, HTTP状态码: " + response.status + "<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }

    logFrame.log("解析响应数据...<br />");
    let timetableRawStr;
    try {
      timetableRawStr = await response.text();
    } catch (parseError) {
      logFrame.log("解析响应数据失败: " + parseError.message + "<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }
    logFrame.log("获取到时间表数据, 长度" + timetableRawStr.length + " ", logFrame.copyButton(timetableRawStr), "<br />");

    const timetable = {
      // totalWeek: 30,
      // startSemester: "",
      // startWithSunday: false,
      // showWeekend: true,
      forenoon: 0,
      afternoon: 0,
      night: 0,
      sections: [],
    };

    logFrame.log("识别时间表<br />");

    if (!isValidJson(timetableRawStr)) {
      logFrame.log("未识别到时间表<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }
    const timetableRaw = JSON.parse(timetableRawStr);
    if (!Array.isArray(timetableRaw)) {
      logFrame.log("未识别到时间表<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }
    if (timetableRaw.length === 0) {
      logFrame.log("时间表为空<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
      return {};
    }

    logFrame.log("读取到" + timetableRaw.length + "节课<br />");

    logFrame.log("格式转换<br />");
    for (const time of timetableRaw) {
      if (!time ||
        typeof time?.jcmc !== "string" ||
        typeof time?.qssj !== "string" ||
        typeof time?.jssj !== "string"
      ) continue;
      timetable.sections.push({
        section: parseInt(time.jcmc),
        startTime: time.qssj, // todo: 格式校验, 是否为"HH:mm"
        endTime: time.jssj, // todo: 格式校验, 是否为"HH:mm"
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
    logFrame.log("转换了" + timetable.sections.length + "节课<br />");

    if (timetableRaw.length > timetable.sections.length) {
      logFrame.log("<b>可能有部分节次识别失败了，请注意检查: </b>", logFrame.copyButton(JSON.stringify(timetable)), "<br />3秒后继续...<br />");
      await new Promise(e => setTimeout(e, 3000));
    }

    return timetable;
  }

}