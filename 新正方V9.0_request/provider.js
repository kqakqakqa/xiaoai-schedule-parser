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
      typeof tryLogFrame?.repoLink !== "function"
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
      logFrame.repoLink()
    );
    return "do not continue";
  }

  /* 获取课程数据请求参数 */
  const defaultGnmkdm = "N253508";
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
      "<b>出现错误</b><br />可能有部分课程转换失败，请注意检查<br />3秒后继续...<br />"
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
        "<b>出现错误</b><br />可能有部分节次转换失败，请注意检查<br />3秒后继续...<br />"
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
   * @version 0.8.027aefc
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
      max-width: calc(80% - 40px);
      max-height: calc(80% - 40px);
      border: none;
      border-radius: 10px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      box-sizing: content-box;
      overflow: hidden;
    `;
    const iframeDocument = cardElement.contentDocument || cardElement.contentWindow?.document;
    // 自动调整高度
    new MutationObserver(() => {
      cardElement.style.height = (iframeDocument.body.scrollHeight + 1) + "px"; // 有小数部分所以+1
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
      iframeDocument.body.scrollTo(0, iframeDocument.body.scrollHeight + 1);
    }
  
    baseElement.log = log;
    baseElement.copyButton = copyButton;
    baseElement.codeBlock = codeBlock;
    baseElement.codeBlockShort = codeBlockShort;
    baseElement.repoLink = repoLink;
    return baseElement;
  
  
    function copyButton(str) {
      const copyButton = document.createElement("button");
      copyButton.textContent = "点击复制";
      copyButton.addEventListener("click", async e => {
        const clipboard = navigator.clipboard ?? {
          writeText: async (s) => new Promise(resolve => {
            const input = document.createElement('input');
            input.style.position = "absolute";
            input.style.left = "-100vw";
            input.value = s;
            document.body.append(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            resolve();
          })
        };
        await clipboard.writeText(String(str));
        e.target.textContent = "已复制";
      });
      return copyButton;
    }
  
    function codeBlock(str) {
      const code = document.createElement("code");
      code.style.cssText = `
        background-color: #eee;
        border-radius: 0.25em;
        font-family: monospace;
        padding: 0 0.5em;
      `;
      code.textContent = String(str);
      return code;
    }
  
    function codeBlockShort(str) {
      return codeBlock(String(str).replace(/^([\s\S]{10})[\s\S]*$/, "$1..."));
    }
  
    function repoLink() {
      const e = document.createElement("span");
      e.append("如果你需要，可以查看本适配项目源代码: ");
      e.append(codeBlock("https://github.com/kqakqakqa/xiaoai-schedule-parser"));
      e.append(" ");
      e.append(copyButton("https://github.com/kqakqakqa/xiaoai-schedule-parser"));
      return e;
    }
  
  }


  /**
   * 通用课程后处理
   * @version 0.12.7f27d73
   */
  function coursesPostProcessings() {
    return {
      check: check,
      mergeConflictsAndDuplicates: mergeConflictsAndDuplicates,
      mergeWeeks: mergeWeeks,
      mergeTeachersOrPositions: mergeTeachersOrPositions,
    };


    // 有效性校验
    function check(courses) { // todo: courses有效性校验(key是否存在, value是否格式匹配, number[]是否按顺序)
      return courses;
    }


    // 合并重复&冲突课程
    function mergeConflictsAndDuplicates(courses) {
      const coursesCopy = JSON.parse(JSON.stringify(courses));
      const courseMap = {};

      for (const course of coursesCopy) {
        for (const week of course.weeks) {
          for (const section of course.sections) { // 拆成多门单周、单节课程
            const key2 = JSON.stringify({
              name: course.name,
              position: course.position,
              teacher: course.teacher,
            });
            const courseSplit1 = {
              name: "",
              position: "",
              teacher: "",
              weeks: [week], // 单周
              day: course.day,
              sections: [section], // 单节
              key2s: [],
            }
            const key1 = JSON.stringify(courseSplit1);

            if (!courseMap[key1]) courseMap[key1] = courseSplit1;
            if (!courseMap[key1].key2s.includes(key2)) { // 舍弃重复课程, 合并冲突课程
              courseMap[key1].name += (courseMap[key1].name === "" ? "" : ",") + course.name;
              courseMap[key1].position += (courseMap[key1].position === "" ? "" : ",") + course.position;
              courseMap[key1].teacher += (courseMap[key1].teacher === "" ? "" : ",") + course.teacher;
              courseMap[key1].key2s.push(key2);
            }
          }
        }
      }

      const courses2 = Object.values(courseMap).sort((a, b) => { // 排序
        if (a.weeks[0] > b.weeks[0]) return (a.weeks[0] - b.weeks[0]);
        if (a.day > b.day) return (a.day - b.day);
        if (a.sections[0] > b.sections[0]) return (a.sections[0] - b.sections[0]);
      });

      const courses3 = [];
      for (const course of courses2) { // 合并连续节次的课程
        const key = JSON.stringify({ // name position teacher weeks day相同即为相同课程
          name: course.name,
          position: course.position,
          teacher: course.teacher,
          weeks: course.weeks,
          day: course.day,
        });
        if (
          courses3[courses3.length - 1]?.key === key &&
          courses3[courses3.length - 1]?.sections?.includes(course.sections[0] - 1)
        ) {
          courses3[courses3.length - 1].sections.push(course.sections[0]);
        } else {
          courses3.push(course);
          courses3[courses3.length - 1].key = key;
        };
      }

      const courses4 = courses3.map(course => {
        delete course.courseSplit2s;
        delete course.key;
        return course;
      });

      return courses4;
    }


    // 合并不同周数的相同课程
    function mergeWeeks(courses) {
      const coursesCopy = JSON.parse(JSON.stringify(courses));
      const courseMap = {};

      for (const course of coursesCopy) {
        const course2 = {
          name: course.name,
          position: course.position,
          teacher: course.teacher,
          weeks: [],
          day: course.day,
          sections: course.sections,
        };
        const key = JSON.stringify(course2); // name position teacher day sections相同即为相同课程
        if (!courseMap[key]) courseMap[key] = course2;
        courseMap[key].weeks = Array.from(new Set(courseMap[key].weeks.concat(course.weeks))).sort((a, b) => a - b);// weeks合并, 去重, 排序
      }

      return Object.values(courseMap);
    }


    // 可选: 合并不同教师或教室的相同课程
    function mergeTeachersOrPositions(courses, mergePositions = true, mergeTeachers = true) {
      const coursesCopy = JSON.parse(JSON.stringify(courses));
      const courseMap = {};

      for (const course of coursesCopy) {
        const course2 = {
          name: course.name,
          position: mergePositions || course.position,
          teacher: mergeTeachers || course.teacher,
          weeks: course.weeks,
          day: course.day,
          sections: course.sections,
          positions: {},
          teachers: {},
        }
        const key = JSON.stringify(course2); // name position(根据条件) teacher(根据条件) weeks day sections相同即为相同课程
        if (!courseMap[key]) courseMap[key] = course2;
        if (mergePositions) courseMap[key].positions[course.position] = Array.from(new Set(courseMap[key].positions[course.position].concat(course.weeks))).sort((a, b) => a - b); // position合并, position对应周数合并, 去重, 排序
        if (mergeTeachers) courseMap[key].teachers[course.teacher] = Array.from(new Set(courseMap[key].teachers[course.teacher].concat(course.weeks))).sort((a, b) => a - b); // teacher合并, teacher对应周数合并, 去重, 排序

      }

      // 改回正确格式
      const coursesNew = Object.values(courseMap).map(course => {
        if (mergePositions) {
          course.position = Object.entries(course.positions).map(([position, weeks]) => position + "(" + weeks.join(",") + "周)").join(" "); // eg. "教室A(1,2周) 教室B(3周)"
          delete course.positions;
        }
        if (mergeTeachers) {
          course.teacher = Object.entries(course.teachers).map(([teacher, weeks]) => teacher + "(" + weeks.join(",") + "周)").join(" "); // eg. "教师A(1,2周) 教师B(3周)"
          delete course.teachers;
        }
        return course;
      });

      return coursesNew;
    }

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