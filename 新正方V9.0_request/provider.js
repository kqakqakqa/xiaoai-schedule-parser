/**
 * 基于模板_全流程
 * @version 0.7.55df398
 * @param { Document | string } iframeContent 获取的网页元素
 * @param { Document | string } frameContent 获取的网页元素
 * @param { Document | string } dom 获取的网页元素
 * @returns { Promise< string > } 包含courses和timetable, 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) { // todo: 重复点击导入按钮

  /* 强制通过模式 */
  if (Number(document.body.dataset["xiaoai_schedule_parser_dev_mode"]) === 1) return JSON.stringify({
    courses: [{
      name: "-",
      position: "",
      teacher: "",
      weeks: [1],
      day: 1,
      sections: [1],
    }],
    timetable: {},
  });

  /* 输出提示栏 */
  let tryLogFrame;
  try {
    tryLogFrame = await newLogFrame();

    if (typeof tryLogFrame?.log !== "function" ||
      typeof tryLogFrame?.copyButton !== "function" ||
      typeof tryLogFrame?.codeBlock !== "function" ||
      typeof tryLogFrame?.codeBlockShort !== "function" ||
      typeof tryLogFrame?.repoLink !== "function" ||
      typeof tryLogFrame?.jumpToPage !== "function"
    ) throw new Error("缺少函数");

  } catch (err) {
    console.error(`初始化输出提示栏失败: "${err.message ?? String(err)}", 将不会有输出提示`);
    tryLogFrame = {
      log: console.log,
      copyButton: Function(),
      codeBlock: Function(),
      codeBlockShort: Function(),
      repoLink: Function(),
    };

  }
  const logFrame = tryLogFrame;

  /* 强制通过模式入口 */
  const devModeSpan = document.createElement("span");
  devModeSpan.innerHTML = "开始导入<br />";
  devModeSpan.addEventListener("click", async e => {
    const count = Number(document.body.dataset["xiaoai_schedule_parser_dev_mode"]) || 10;
    if (count === 1) {
      e.target.outerHTML = "<b>强制通过模式</b><br />";
    } else {
      document.body.dataset["xiaoai_schedule_parser_dev_mode"] = String(count - 1);
    }
  });
  logFrame.log(devModeSpan);

  /* 页面检测 */
  if (!document.URL.includes("/xskbcx_cxXskbcxIndex.html")) {
    logFrame.log(
      "<b>导入失败</b><br />页面不正确, 请确保当前位于课表查询页面<br /><br />",
      logFrame.jumpToPage(),
      "<br /><br />",
      logFrame.repoLink()
    );
    return "do not continue";
  }

  /* 获取课程数据请求参数 */
  const defaultGnmkdm = undefined;
  const useSu = false;
  const useXsdm = true;
  const useValidate = false;

  let tryXnm, tryXqm, tryGnmkdm, tryXsdm, trySu, tryValidate;
  try {
    tryXnm = document.querySelector("#xnm")?.value ?? document.querySelector("#xnm_hide")?.value; // 学年
    tryXqm = document.querySelector("#xqm")?.value ?? document.querySelector("#xqm_hide")?.value; // 学期
    tryGnmkdm = document.querySelector("#gnmkdm")?.value ?? defaultGnmkdm;
    tryXsdm = document.querySelector("#xsdm")?.value ?? "";
    trySu = document.querySelector("#sessionUserKey")?.value;
    tryValidate = document.querySelector("#xsdm")?.value;


  } catch (err) {
    logFrame.log(
      "<b>导入失败</b><br />获取请求参数失败: ",
      logFrame.codeBlock(err.message ?? String(err)),
      ", 请确保当前位于课表查询页面<br /><br />",
      logFrame.repoLink()
    );
    return "do not continue";

  }
  const xnm = tryXnm;
  const xqm = tryXqm;
  const gnmkdm = tryGnmkdm;
  const xsdm = tryXsdm;
  const su = trySu;
  const validate = tryValidate;

  const fetchBody = new URLSearchParams({
    xnm: xnm,
    xqm: xqm,
    gnmkdm: gnmkdm,
    kzlx: "ck",
    ...(useXsdm ? { xsdm: xsdm } : {}),
    ...(useSu ? { su: su } : {}),
    ...(useValidate ? { validate: validate } : {})
  }).toString();

  logFrame.log(
    "获取到课程数据请求参数: ",
    logFrame.codeBlockShort(fetchBody),
    " ",
    logFrame.copyButton(fetchBody),
    "<br />"
  );

  /* 获取课程数据 */
  logFrame.log("获取课程数据...<br />");

  let tryResponseStr;
  try {
    const response = await fetch("./xskbcx_cxXsgrkb.html", {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
        "x-requested-with": "XMLHttpRequest"
      },
      body: fetchBody,
    });

    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

    tryResponseStr = await response.text();

  } catch (err) {
    logFrame.log(
      "<b>导入失败</b><br />获取课程数据失败: ",
      logFrame.codeBlock(err.message ?? String(err)),
      ", 请确保教务系统已登录<br /><br />",
      logFrame.repoLink()
    );
    return "do not continue";

  }
  const responseStr = tryResponseStr;

  logFrame.log(
    "获取到课程数据: ",
    logFrame.codeBlockShort(responseStr),
    " ",
    logFrame.copyButton(responseStr),
    "<br />"
  );

  /* 识别课程数据 */
  let tryKbList;
  try {
    if (!isValidJson(responseStr)) throw new Error("课程数据不是JSON");

    tryKbList = JSON.parse(responseStr).kbList;

    if (!Array.isArray(tryKbList)) throw new Error("课程数据不是Array");

  } catch (err) {
    logFrame.log(
      "<b>导入失败</b><br />识别课程数据失败: ",
      logFrame.codeBlock(err.message ?? String(err)),
      ", 请确保教务系统已登录<br /><br />",
      logFrame.repoLink()
    );
    return "do not continue";

  }
  const kbList = tryKbList;

  logFrame.log(
    `识别到${kbList.length}门课程 `,
    logFrame.copyButton(JSON.stringify(kbList)),
    "<br />"
  );

  /* 转换课程数据格式 */
  let tryCourses = [];
  let tryCountXqh = {};
  for (const course of kbList) {
    try {
      if (
        !course ||
        typeof course.zcd !== "string" ||
        typeof course.jcs !== "string"
      ) continue;

      const name = course.kcmc ?? "-";
      const position = course.cdmc ?? "";
      const teacher = course.xm ?? "";
      const weeks = parseWeeks(course.zcd);
      const day = parseInt(course.xqj);
      const sections = parseSections(course.jcs);

      if (
        !Array.isArray(weeks) ||
        !Array.isArray(sections) ||
        weeks.length === 0 ||
        sections.length === 0 ||
        Number.isNaN(day)
      ) continue;

      tryCourses.push({
        name: name,
        position: position,
        teacher: teacher,
        weeks: weeks,
        day: day,
        sections: sections,
      });

      /* 顺便统计校区 */
      const xqhId = course?.xqh_id ?? "";
      tryCountXqh[xqhId] = (tryCountXqh[xqhId] ?? 0) + 1;

    } catch (err) {
      continue;
    }

  }
  const courses = tryCourses;
  const countXqh = tryCountXqh;

  logFrame.log(
    `转换了${courses.length}门课程 `,
    logFrame.copyButton(JSON.stringify(courses)),
    "<br />"
  );

  if (kbList.length > courses.length) {
    logFrame.log(
      "<b>出现错误</b><br />可能有部分课程转换失败, 请注意检查<br />3秒后继续...<br />"
    );
    await new Promise(e => setTimeout(e, 3000));
  }

  /* 顺便识别校区 */
  const mostXqhId = Object.entries(countXqh).sort(
    ([, v1], [, v2]) => (v2 - v1)
  )[0]?.[0];

  /* 初始化课程后处理 */
  let tryPostProcessings;
  try {
    tryPostProcessings = coursesPostProcessings();

    if (
      typeof tryPostProcessings?.mergeConflictsAndDuplicates !== "function" ||
      typeof tryPostProcessings?.mergeWeeks !== "function" ||
      typeof tryPostProcessings?.mergeTeachersOrPositions !== "function"
    ) throw new Error("缺少函数");

  } catch (err) {
    logFrame.log(
      "<b>出现错误</b><br />初始化课程后处理失败: ",
      logFrame.codeBlock(err.message ?? String(err)),
      ", 将跳过课程后处理<br />3秒后继续...<br />"
    );
    tryPostProcessings = undefined;
    await new Promise(e => setTimeout(e, 3000));

  }
  const postProcessings = tryPostProcessings;

  /* 课程后处理 */
  let tryCoursesProcessed = postProcessings ? await applyPostProcessings() : courses;

  async function applyPostProcessings() {
    const maxCourses = 150;

    let tryCourses1;
    try {
      tryCourses1 = postProcessings.mergeConflictsAndDuplicates(courses);

      if (tryCourses1 === undefined) throw new Error("函数没有输出");
      if (!Array.isArray(tryCourses1)) throw new Error("课程数据不是Array");

    } catch (err) {
      logFrame.log(
        "<b>出现错误</b><br />处理冲突课程失败: ",
        logFrame.codeBlock(err.message ?? String(err)),
        ", 将跳过处理冲突课程<br />3秒后继续...<br />"
      );
      tryCourses1 = courses;
      await new Promise(e => setTimeout(e, 3000));

    }
    const courses1 = tryCourses1;

    logFrame.log(
      `处理冲突课程, 处理后还有${courses1.length}门课程 `,
      logFrame.copyButton(JSON.stringify(courses1)),
      "<br />"
    );

    let tryCourses2;
    try {
      tryCourses2 = postProcessings.mergeWeeks(courses1);

      if (tryCourses2 === undefined) throw new Error("函数没有输出");
      if (!Array.isArray(tryCourses2)) throw new Error("课程数据不是Array");

    } catch (err) {
      logFrame.log(
        "<b>出现错误</b><br />合并各周的相同课程失败: ",
        logFrame.codeBlock(err.message ?? String(err)),
        ", 将跳过合并各周的相同课程<br />3秒后继续...<br />"
      );
      tryCourses2 = courses1;
      await new Promise(e => setTimeout(e, 3000));

    }
    const courses2 = tryCourses2;

    logFrame.log(
      `合并各周的相同课程, 合并后还有${courses2.length}门课程 `,
      logFrame.copyButton(JSON.stringify(courses2)),
      "<br />"
    );

    let tryCourses3;
    if (courses2.length > maxCourses) {
      try {
        tryCourses3 = postProcessings.mergeTeachersOrPositions(courses2, mergePositions = true, mergeTeachers = true);

        if (tryCourses3 === undefined) throw new Error("函数没有输出");
        if (!Array.isArray(tryCourses3)) throw new Error("课程数据不是Array");

      } catch (err) {
        logFrame.log(
          "<b>出现错误</b><br />合并不同教师/教室的同名课程失败: ",
          logFrame.codeBlock(err.message ?? String(err)),
          ", 将跳过合并不同教师/教室的同名课程<br />3秒后继续...<br />"
        );
        tryCourses3 = courses2;
        await new Promise(e => setTimeout(e, 3000));

      }

    } else {
      tryCourses3 = courses2;
    }
    const courses3 = tryCourses3;

    logFrame.log(
      `合并不同教师/教室的同名课程, 合并后还有${courses3.length}门课程 `,
      logFrame.copyButton(JSON.stringify(courses3)),
      "<br />"
    );

    return courses3;

  }

  const coursesProcessed = tryCoursesProcessed;

  /* 获取时间表 */
  let tryTimetable = await getTimetable();

  async function getTimetable() {
    /* 获取时间表数据请求参数 */
    const fetchBody2 = new URLSearchParams({
      xnm: xnm,
      xqm: xqm,
      xqh_id: mostXqhId, // 校区号
      gnmkdm: gnmkdm,
      ...(useSu ? { su: su } : {}),
    }).toString();

    logFrame.log(
      "获取到时间表数据请求参数: ",
      logFrame.codeBlockShort(fetchBody2),
      " ",
      logFrame.copyButton(fetchBody2),
      "<br />"
    );

    /* 获取时间表数据 */
    logFrame.log("获取时间表数据...<br />");

    let tryResponseStr2;
    try {
      const response = await fetch("./xskbcx_cxRjc.html", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          "x-requested-with": "XMLHttpRequest"
        },
        body: fetchBody2,
      });

      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

      tryResponseStr2 = await response.text();

    } catch (err) {
      logFrame.log(
        "<b>出现错误</b><br />获取时间表数据失败: ",
        logFrame.codeBlock(err.message ?? String(err)),
        ", 将跳过获取时间表<br />3秒后继续...<br />",
      );
      await new Promise(e => setTimeout(e, 3000));
      return {};

    }
    const responseStr2 = tryResponseStr2;

    logFrame.log(
      "获取到时间表数据: ",
      logFrame.codeBlockShort(responseStr2),
      " ",
      logFrame.copyButton(responseStr2),
      "<br />"
    );

    /* 识别时间表 */
    let tryTimetableRaw;
    try {
      if (!isValidJson(responseStr2)) throw new Error("时间表数据不是JSON");

      tryTimetableRaw = JSON.parse(responseStr2);

      if (!Array.isArray(tryTimetableRaw)) throw new Error("时间表数据不是Array");

      if (tryTimetableRaw.length === 0) throw new Error("时间表为空");

    } catch (err) {
      logFrame.log(
        "<b>出现错误</b><br />识别时间表失败: ",
        logFrame.codeBlock(err.message ?? String(err)),
        ", 将跳过获取时间表<br />3秒后继续...<br />"
      );
      await new Promise(e => setTimeout(e, 3000));
      return {};

    }
    const timetableRaw = tryTimetableRaw;

    logFrame.log(
      `识别到${timetableRaw.length}节课 `,
      logFrame.copyButton(JSON.stringify(timetableRaw)),
      "<br />"
    );

    /* 转换时间表格式 */
    let trySections = [];
    let tryForenoon, tryAfternoon, tryNight;
    for (const time of timetableRaw) {
      try {
        if (!time ||
          typeof time.qssj !== "string" ||
          typeof time.jssj !== "string"
        ) continue;

        const section = (typeof time?.jcmc === "string") ? parseInt(time.jcmc) : trySections.length + 1 // 没有指定节次则视为按顺序

        trySections.push({
          section: section,
          startTime: parseTime(time.qssj),
          endTime: parseTime(time.jssj),
        });

        switch (time.rsdmc) {
          case "上午":
            tryForenoon = (tryForenoon ?? 0) + 1;
            break;
          case "下午":
            tryAfternoon = (tryAfternoon ?? 0) + 1;
            break;
          case "晚上":
            tryNight = (tryNight ?? 0) + 1;
            break;
        }

      } catch (err) {
        continue;
      }

    }
    const sections = trySections;

    logFrame.log(
      `转换了${sections.length}节课 `,
      logFrame.copyButton(JSON.stringify(sections)),
      "<br />"
    );

    if (timetableRaw.length > sections.length) {
      logFrame.log(
        "<b>出现错误</b><br />可能有部分节次转换失败, 请注意检查<br />3秒后继续...<br />"
      );
      await new Promise(e => setTimeout(e, 3000));
    }

    /* 获取节次分段数据 */
    if (
      tryForenoon === undefined ||
      tryAfternoon === undefined ||
      tryNight === undefined
    ) ({ tryForenoon, tryAfternoon, tryNight } = await getSectionsRsd());

    async function getSectionsRsd() {
      logFrame.log("获取节次分段数据...<br />");

      let tryResponseStr3;
      try {
        const response = await fetch("./xskbcx_cxRsd.html", {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest"
          },
          body: fetchBody2,
        });

        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

        tryResponseStr3 = await response.text();

      } catch (err) {
        logFrame.log(
          "<b>出现错误</b><br />获取节次分段数据失败: ",
          logFrame.codeBlock(err.message ?? String(err)),
          ", 将跳过获取节次分段数据<br />3秒后继续...<br />",
        );
        await new Promise(e => setTimeout(e, 3000));
        return {};

      }
      const responseStr3 = tryResponseStr3;

      logFrame.log(
        "获取到节次分段数据: ",
        logFrame.codeBlockShort(responseStr3),
        " ",
        logFrame.copyButton(responseStr3),
        "<br />"
      );

      /* 识别节次分段 */
      let tryRsd;
      try {
        if (!isValidJson(responseStr3)) throw new Error("节次分段数据不是JSON");

        tryRsd = JSON.parse(responseStr3);

        if (!Array.isArray(tryRsd)) throw new Error("节次分段数据不是Array");

        if (tryRsd.length === 0) throw new Error("节次分段为空");

      } catch (err) {
        logFrame.log(
          "<b>出现错误</b><br />识别节次分段失败: ",
          logFrame.codeBlock(err.message ?? String(err)),
          ", 将跳过获取节次分段<br />3秒后继续...<br />"
        );
        await new Promise(e => setTimeout(e, 3000));
        return {};

      }
      const rsd = tryRsd;

      logFrame.log(
        `识别到${rsd.length}个节次分段 `,
        logFrame.copyButton(JSON.stringify(rsd)),
        "<br />"
      );

      /* 转换节次分段格式 */
      let tryForenoon, tryAfternoon, tryNight;
      try {
        for (const r of rsd) {
          if (!r ||
            typeof r.rsdmc !== "string"
          ) throw new Error("节次分段数据格式不正确");

          const count = parseInt(r.rsdzjs);

          if (
            Number.isNaN(count)
          ) throw new Error("节次分段包含节数的格式不正确");

          switch (r.rsdmc) {
            case "上午":
              tryForenoon = count;
              break;
            case "下午":
              tryAfternoon = count;
              break;
            case "晚上":
              tryNight = count;
              break;
            default:
              throw new Error("节次分段不是上午/下午/晚上之一");
          }

          if (
            tryForenoon === undefined &&
            tryAfternoon === undefined &&
            tryNight === undefined
          ) throw new Error("所有节次分段都为空");

          tryForenoon = tryForenoon ?? 0;
          tryAfternoon = tryAfternoon ?? 0;
          tryNight = tryNight ?? 0;

        }

      } catch (err) {
        logFrame.log(
          "<b>出现错误</b><br />转换节次分段格式失败: ",
          logFrame.codeBlock(err.message ?? String(err)),
          ", 将跳过获取节次分段<br />3秒后继续...<br />"
        );
        await new Promise(e => setTimeout(e, 3000));
        return {};

      }

      return {
        tryForenoon: tryForenoon,
        tryAfternoon: tryAfternoon,
        tryNight: tryNight,
      }

    }

    const forenoon = tryForenoon;
    const afternoon = tryAfternoon;
    const night = tryNight;

    const timetable = {
      ...(forenoon !== undefined ? { forenoon: forenoon } : {}),
      ...(afternoon !== undefined ? { afternoon: afternoon } : {}),
      ...(night !== undefined ? { night: night } : {}),
      sections: sections,
    };

    return timetable;

  }
  const timetable = tryTimetable;

  logFrame.log(
    "获取到时间表: ",
    logFrame.codeBlockShort(JSON.stringify(timetable)),
    " ",
    logFrame.copyButton(JSON.stringify(timetable)),
    "<br />"
  );

  /* 完成导入 */
  logFrame.log("<br />", logFrame.repoLink(), "<br />3秒后完成导入...");
  await new Promise(e => setTimeout(e, 3000));

  return JSON.stringify({ courses: coursesProcessed, timetable: timetable });


  /* 使用的组件 */

  /**
   * 输出提示栏 需要有dom环境
   * @version 0.9.7543a31
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


  /**
   * 新正方周次解析
   * @version 0.7.local
   * @param { string } weeksString eg. "4-6周(双),7-11周,13周"
   * @returns { number[] } eg. [4,6,7,8,9,10,11,13]
   */
  function parseWeeks(weeksString) {
    const weeks = [];
    const ranges = weeksString.replace(/第/g, "").split(/[,，]/); // eg: ["4-6周(双)",...]
    for (const rangeWithLabel of ranges) { // eg: "4-6周(双)"
      const [rangeString, oddEvenLabel] = rangeWithLabel.split("周"); // eg: ["4-6","(双)"]
      const range = rangeString.split("-"); // eg: ["4","6"]
      const start = parseInt(range[0]);
      const end = parseInt(range[1] ?? range[0]); // 只有一周就设置end为start
      const evenWeeks = (!oddEvenLabel || oddEvenLabel.includes("双")); // 双周 or 不分单双周
      const oddWeeks = (!oddEvenLabel || oddEvenLabel.includes("单")); // 单周 or 不分单双周
      for (let w = start; w <= end; w++) { // 填充 weeks 的 start-end 之间
        if ((!(w % 2) && evenWeeks) || ((w % 2) && oddWeeks)) weeks.push(w);
      }
    }
    return weeks;
  }


  /**
   * 新正方节次解析
   * @version 0.6.local
   * @param { string } sectionsString eg. "1-4"
   * @returns { number[] } eg. [1,2,3,4]
   */
  function parseSections(sectionsString) {
    const sections = [];
    const ranges = sectionsString.replace(/[第节]/g, "").split(/[,，]/); // 以防万一格式是"第1-4节,6-8节"
    for (const rangeString of ranges) {
      const range = rangeString.split("-");
      const start = parseInt(range[0]);
      const end = parseInt(range[1] ?? range[0]); // 只有一节课就设置end为start
      for (let s = start; s <= end; s++) {
        sections.push(s);
      }
    }
    return sections;
  }


  /**
   * 新正方时间解析
   * @version 0.1.local
   * @param { string } sectionsString eg. "08:00", "8:00", "08:00:00"
   * @returns { string } eg. "08:00"
   */
  function parseTime(input) {
    const parts = input.split(":").map(Number);
    const hours = parts[0].toString().padStart(2, '0');
    const minutes = parts[1].toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }


  function isValidJson(str) {
    try {
      const obj = JSON.parse(str);
      return typeof obj === "object" && obj !== null;
    } catch (e) {
      return false;
    }
  }

}