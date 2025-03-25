/**
 * 基于模板_全流程
 * @version 0.7.55df398
 * @param { Document | string } iframeContent 获取的网页元素
 * @param { Document | string } frameContent 获取的网页元素
 * @param { Document | string } dom 获取的网页元素
 * @returns { Promise< string > } 包含courses和timetable, 导出给parser.js和timer.js, parser.js和timer.js不做处理, 仅转发
 */
async function scheduleHtmlProvider(iframeContent = "", frameContent = "", dom = document) { // todo: 重复点击导入按钮

  /* 输出提示栏 */
  let tryLogFrame;
  try {
    tryLogFrame = await newLogFrame();

    if (typeof tryLogFrame?.log !== "function" || typeof tryLogFrame?.copyButton !== "function" || typeof tryLogFrame?.repoLink !== "function") {
      console.error("初始化输出提示栏失败, 将不会有输出提示");
      tryLogFrame = undefined;
    }

  } catch (err) {
    console.error(`初始化输出提示栏失败: "${err?.message ?? err}", 将不会有输出提示`);
  }
  const logFrame = tryLogFrame ?? { log: console.log, copyButton: Function(), repoLink: Function() };

  logFrame.log("开始导入<br />");

  /* 页面检测 */
  if (!document.URL.includes("/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html")) {
    logFrame.log(`<b>导入失败</b><br />页面不正确, 请确保当前位于 "学生课表查询" 页面<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }

  /* 获取请求参数*/
  logFrame.log("获取请求参数<br />");
  let tryXnm, tryXqm, tryGnmkdm;
  try {
    tryXnm = document.querySelector("#xnm")?.value ?? document.querySelector("#xnm_hide")?.value; // 学年
    tryXqm = document.querySelector("#xqm")?.value ?? document.querySelector("#xqm_hide")?.value; // 学期
    tryGnmkdm = document.querySelector("#gnmkdm")?.value ?? "";

    if (typeof tryXnm !== "string" ||
      typeof tryXqm !== "string" ||
      typeof tryGnmkdm !== "string") {
      logFrame.log(`<b>导入失败</b><br />获取请求参数失败, 请确保当前位于 "学生课表查询" 页面<br /><br />`, logFrame.repoLink());
      return "do not continue";
    }

  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />获取请求参数失败: "${err?.message ?? err}", 请确保当前位于 "学生课表查询" 页面<br /><br />`);
    return "do not continue";
  }
  const xnm = tryXnm;
  const xqm = tryXqm;
  const gnmkdm = tryGnmkdm;

  /* 获取课程数据 */
  logFrame.log("获取课程数据...<br />");
  let tryResponse;
  try {
    tryResponse = await fetch("./xskbcx_cxXsgrkb.html", { // todo: 网址可能是"/jwglxt/kbcx/xskbcxMobile_cxXsKb.html"
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

    if (!tryResponse.ok) {
      logFrame.log(`<b>导入失败</b><br />网络请求失败: "${tryResponse.status} ${tryResponse.statusText}", 请确保教务系统已登录<br /><br />`, logFrame.repoLink());
      return "do not continue";
    }

  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />网络请求失败: "${err?.message ?? err}", 请确保教务系统已登录<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }
  const response = tryResponse;

  let tryResponseStr;
  try {
    tryResponseStr = await response.text();

  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />解析响应数据失败: "${err?.message ?? err}", 请确保教务系统已登录<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }
  const responseStr = tryResponseStr;

  logFrame.log(`获取到课程数据, 长度${responseStr?.length} `, logFrame.copyButton(responseStr), "<br />");

  /* 识别课程数据 */
  logFrame.log("识别课程数据<br />");

  let tryKbList;
  try {
    if (!isValidJson(responseStr)) {
      logFrame.log("<b>导入失败</b><br />课程数据格式不符合预期, 请确保教务系统已登录<br /><br />", logFrame.repoLink());
      return "do not continue";
    }

    tryKbList = JSON.parse(responseStr).kbList;

    if (!Array.isArray(tryKbList)) {
      logFrame.log("<b>导入失败</b><br />课程数据格式不符合预期, 请确保教务系统已登录<br /><br />", logFrame.repoLink());
      return "do not continue";
    }

  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />识别课程数据失败: "${err?.message ?? err}"<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }
  const kbList = tryKbList;

  logFrame.log(`识别到${kbList?.length}门课程 `, logFrame.copyButton(JSON.stringify(kbList)), "<br />");

  /* 转换课程数据格式 */
  logFrame.log("转换课程数据格式<br />");

  let tryCourses, tryCountXqh;
  try {
    tryCourses = [];
    tryCountXqh = {};

    for (const course of kbList) {
      try {
        if (
          !course ||
          typeof course?.zcd !== "string" ||
          typeof course?.jcs !== "string"
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
          name: name, // 能不能是""?
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

  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />转换课程数据格式失败: "${err?.message ?? err}"<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }
  const courses = tryCourses ?? [];
  const countXqh = tryCountXqh ?? {};

  logFrame.log(`转换了${courses?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses)), "<br />");

  if (kbList.length > courses.length) {
    logFrame.log("<b>可能有部分课程识别失败，请注意检查: </b>", logFrame.copyButton(JSON.stringify(courses)), "<br />3秒后继续...<br />");
    await new Promise(e => setTimeout(e, 3000));
  }

  logFrame.log("识别校区<br />");
  const mostXqhId = Object.entries(countXqh).sort(
    ([, v1], [, v2]) => (v2 - v1)
  )[0]?.[0] ?? "";

  /* 课程后处理 */
  let tryPostProcessings;
  try {
    tryPostProcessings = coursesPostProcessings();

    if (
      typeof tryPostProcessings?.mergeConflictsAndDuplicates !== "function" ||
      typeof tryPostProcessings?.mergeWeeks !== "function" ||
      typeof tryPostProcessings?.mergeTeachersOrPositions !== "function"
    ) {
      logFrame.log("<b>初始化课程后处理失败, </b>将跳过课程后处理<br />3秒后继续...<br />");
      tryPostProcessings = undefined;
      await new Promise(e => setTimeout(e, 3000));
    }

  } catch (err) {
    logFrame.log(`<b>初始化课程后处理失败: </b>"${err?.message ?? err}", 将跳过课程后处理<br />3秒后继续...<br />`);
    await new Promise(e => setTimeout(e, 3000));
  }
  const postProcessings = tryPostProcessings ?? { mergeConflictsAndDuplicates: a => a, mergeWeeks: a => a, mergeTeachersOrPositions: a => a };

  const maxCourses = 150;

  logFrame.log("处理冲突课程<br />");
  let tryCourses1;
  try {
    tryCourses1 = postProcessings.mergeConflictsAndDuplicates(courses);

    if (tryCourses === undefined) {
      logFrame.log(`<b>处理冲突课程失败, </b>将跳过处理冲突课程<br />3秒后继续...<br />`);
      await new Promise(e => setTimeout(e, 3000));
    }

  } catch (err) {
    logFrame.log(`<b>处理冲突课程失败: </b>"${err?.message ?? err}", 将跳过处理冲突课程<br />3秒后继续...<br />`);
    await new Promise(e => setTimeout(e, 3000));
  }
  const courses1 = tryCourses1 ?? courses;
  logFrame.log(`处理后还有${courses1?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses1)), "<br />");

  logFrame.log("合并不同周数的相同课程<br />");
  let tryCourses2;
  try {
    tryCourses2 = postProcessings.mergeWeeks(courses1);

    if (tryCourses2 === undefined) {
      logFrame.log(`<b>合并课程失败, </b>将跳过合并课程<br />3秒后继续...<br />`);
      await new Promise(e => setTimeout(e, 3000));
    }

  } catch (err) {
    logFrame.log(`<b>合并课程失败: </b>"${err?.message ?? err}", 将跳过合并课程<br />3秒后继续...<br />`);
    await new Promise(e => setTimeout(e, 3000));
  }
  const courses2 = tryCourses2 ?? courses1;
  logFrame.log(`合并后还有${courses2?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses2)), "<br />");

  let tryCourses3;
  let courses3 = courses2;
  if (courses2?.length > maxCourses) {
    logFrame.log("合并不同教师/教室的相同课程<br />");
    try {
      tryCourses3 = postProcessings.mergeTeachersOrPositions(courses2, mergePositions = true, mergeTeachers = true);

      if (tryCourses3 === undefined) {
        logFrame.log(`<b>合并课程失败, </b>将跳过合并课程<br />3秒后继续...<br />`);
        await new Promise(e => setTimeout(e, 3000));
      }

    } catch (err) {
      logFrame.log(`<b>合并课程失败: </b>"${err?.message ?? err}", 将跳过合并课程<br />3秒后继续...<br />`);
      await new Promise(e => setTimeout(e, 3000));
    }
    courses3 = tryCourses3 ?? courses2;
    logFrame.log(`合并后还有${courses3?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses3)), "<br />");
  }

  /* 获取时间表 */
  let tryTimetable;
  try {
    tryTimetable = await getTimetable();

    async function getTimetable() {
      logFrame.log("获取时间表数据...<br />");

      let tryResponse2;
      try {
        tryResponse2 = await fetch("./xskbcx_cxRjc.html", { // todo: 网址可能是"/jwglxt/jzgl/skxxMobile_cxRsdjc.html"
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            "x-requested-with": "XMLHttpRequest"
          },
          body: new URLSearchParams({
            xnm: xnm,
            xqm: xqm,
            xqh_id: mostXqhId, // 校区号
            gnmkdm: gnmkdm,
          }).toString(),
        });

        if (!tryResponse2.ok) {
          logFrame.log(`<b>网络请求失败: </b>"${tryResponse2.status} ${tryResponse2.statusText}", 将跳过获取时间表数据<br />3秒后继续...<br />`);
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

      } catch (err) {
        logFrame.log(`<b>网络请求失败: </b>"${err?.message ?? err}", 将跳过获取时间表数据<br />3秒后继续...<br />`);
        await new Promise(e => setTimeout(e, 3000));
        return {};
      }
      const response2 = tryResponse2;

      let tryResponseStr2;
      try {
        tryResponseStr2 = await response2.text();

      } catch (err) {
        logFrame.log(`<b>解析响应数据失败: </b>"${err?.message ?? err}", 将跳过获取时间表数据<br />3秒后继续...<br />`, logFrame.repoLink());
        await new Promise(e => setTimeout(e, 3000));
        return {};
      }
      const responseStr2 = tryResponseStr2;

      logFrame.log(`获取到时间表数据, 长度${responseStr2?.length} `, logFrame.copyButton(responseStr2), "<br />");

      /* 识别时间表数据 */
      logFrame.log("识别时间表数据<br />");

      let tryTimetableRaw;
      try {
        if (!isValidJson(responseStr2)) {
          logFrame.log("<b>未识别到时间表, </b>将跳过获取时间表<br />3秒后继续...<br />");
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

        tryTimetableRaw = JSON.parse(responseStr2);

        if (!Array.isArray(tryTimetableRaw)) {
          logFrame.log("<b>未识别到时间表, </b>将跳过获取时间表<br />3秒后继续...<br />");
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

        if (tryTimetableRaw.length === 0) {
          logFrame.log("<b>时间表为空, </b>将跳过获取时间表<br />3秒后继续...<br />");
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

      } catch (err) {
        logFrame.log(`<b>识别时间表数据失败: </b>"${err?.message ?? err}"将跳过获取时间表<br />3秒后继续...<br />`);
        await new Promise(e => setTimeout(e, 3000));
        return {};
      }
      const timetableRaw = tryTimetableRaw;

      /* 转换时间表数据格式 */
      logFrame.log("转换时间表数据格式<br />");

      let tryTimetable;
      try {
        let forenoon = 0;
        let afternoon = 0;
        let night = 0;
        const sections = [];

        for (const time of timetableRaw) {
          if (!time ||
            typeof time?.jcmc !== "string" ||
            typeof time?.qssj !== "string" ||
            typeof time?.jssj !== "string"
          ) continue;

          sections.push({
            section: parseInt(time.jcmc),
            startTime: time.qssj, // todo: 格式校验, 是否为"HH:mm"
            endTime: time.jssj, // todo: 格式校验, 是否为"HH:mm"
          });

          switch (time.rsdmc) {
            case "上午":
              forenoon++;
              break;
            case "下午":
              afternoon++;
              break;
            case "晚上":
              night++;
              break;
          }

        }

        if (sections.length === 0) {
          logFrame.log(`<b>时间表为空, </b>将跳过获取时间表<br />3秒后继续...<br />`);
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

        tryTimetable = {
          forenoon: forenoon,
          afternoon: afternoon,
          night: night,
          sections: sections,
        };

        if (tryTimetable === undefined) {
          logFrame.log(`<b>转换时间表数据格式失败, </b>将跳过获取时间表<br />3秒后继续...<br />`);
          await new Promise(e => setTimeout(e, 3000));
          return {};
        }

      } catch (err) {
        logFrame.log(`<b>转换时间表数据格式失败: </b>"${err?.message ?? err}", 将跳过获取时间表<br />3秒后继续...<br />`);
        await new Promise(e => setTimeout(e, 3000));
        return {};
      }
      const timetable = tryTimetable;

      logFrame.log(`转换了${timetable.sections.length}节课<br />`);

      if (timetableRaw.length > timetable.sections.length) {
        logFrame.log("<b>可能有部分节次识别失败了，请注意检查: </b>", logFrame.copyButton(JSON.stringify(timetable)), "<br />3秒后继续...<br />");
        await new Promise(e => setTimeout(e, 3000));
      }

      return timetable;
    }

  } catch (err) {
    logFrame.log(`<b>获取时间表失败: </b>"${err?.message ?? err}", 将跳过获取时间表<br />3秒后继续...<br />`);
    await new Promise(e => setTimeout(e, 3000));
  }
  const timetable = tryTimetable;

  if (typeof timetable === "object" && Object.keys(timetable).length === 0) {
    logFrame.log("没有配置时间表 <br />");
  } else {
    logFrame.log(`共获取到${timetable?.sections?.length}节课 `, logFrame.copyButton(JSON.stringify(timetable)), "<br />");
  }

  /* 完成导入 */
  logFrame.log("<br />", logFrame.repoLink(), "<br />3秒后完成导入...");
  await new Promise(e => setTimeout(e, 3000));
  return JSON.stringify({ courses: courses3, timetable: timetable });


  /* 使用的组件 */

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


  function isValidJson(str) {
    try {
      const obj = JSON.parse(str);
      return typeof obj === "object" && obj !== null;
    } catch (e) {
      return false;
    }
  }

}