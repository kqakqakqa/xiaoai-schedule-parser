/**
 * 模板_全流程
 * @version 0.4
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
  if (!document.URL.includes("")) {
    logFrame.log("<b>导入失败</b><br />页面不正确<br /><br />", logFrame.repoLink());
    return "do not continue";
  }

  /* 获取课程数据 */
  logFrame.log("获取课程数据...<br />");
  let tryResponse;
  try {
    tryResponse = await fetch("");
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

  let tryCourses;
  try {
    tryCourses = [];
    if (tryCourses === undefined) {
      logFrame.log(`<b>导入失败</b><br />识别课程数据失败<br /><br />`, logFrame.repoLink());
      return "do not continue";
    }
  } catch (err) {
    logFrame.log(`<b>导入失败</b><br />识别课程数据失败: "${err?.message ?? err}"<br /><br />`, logFrame.repoLink());
    return "do not continue";
  }
  const courses = tryCourses ?? [];

  logFrame.log(`共识别到${courses?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses)), "<br />");

  /* 课程后处理 */
  let tryPostProcessings;
  try {
    tryPostProcessings = postProcessings();
    if (
      typeof tryPostProcessings?.mergeConflictsAndDuplicates !== "function" ||
      typeof tryPostProcessings?.mergeWeeks !== "function" ||
      typeof tryPostProcessings?.mergeTeachersOrPositions !== "function"
    ) {
      logFrame.log("初始化课程后处理失败, 将跳过课程后处理<br />");
      tryPostProcessings = undefined;
    }
  } catch (err) {
    logFrame.log(`初始化课程后处理失败: "${err?.message ?? err}", 将跳过课程后处理<br />`);
  }
  const postProcessings = tryPostProcessings ?? { mergeConflictsAndDuplicates: a => a, mergeWeeks: a => a, mergeTeachersOrPositions: a => a };

  const maxCourses = 150;

  logFrame.log("处理冲突课程<br />");
  let tryCourses1;
  try {
    tryCourses1 = postProcessings.mergeConflictsAndDuplicates(courses);
    if (tryCourses === undefined) {
      logFrame.log(`处理冲突课程失败, 将跳过处理冲突课程<br />`);
    }
  } catch (err) {
    logFrame.log(`处理冲突课程失败: "${err?.message ?? err}", 将跳过处理冲突课程<br />`);
  }
  const courses1 = tryCourses1 ?? courses;
  logFrame.log(`处理后还有${courses1?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses1)), "<br />");

  logFrame.log("合并不同周数的相同课程<br />");
  let tryCourses2;
  try {
    tryCourses2 = postProcessings.mergeWeeks(courses1);
    if (tryCourses2 === undefined) {
      logFrame.log(`合并课程失败, 将跳过合并课程<br />`);
    }
  } catch (err) {
    logFrame.log(`合并课程失败: "${err?.message ?? err}", 将跳过合并课程<br />`);
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
        logFrame.log(`合并课程失败, 将跳过合并课程<br />`);
      }
    } catch (err) {
      logFrame.log(`合并课程失败: "${err?.message ?? err}", 将跳过合并课程<br />`);
    }
    courses3 = tryCourses3 ?? courses2;
    logFrame.log(`合并后还有${courses3?.length}门课程 `, logFrame.copyButton(JSON.stringify(courses3)), "<br />");
  }

  /* 获取时间表 */
  logFrame.log("获取时间表<br />");
  let tryTimetable;
  try {
    tryTimetable = {};
    // tryTimetable = {
    //   totalWeek: 1, // 总周数, [1, 30]之间的int
    //   startSemester: '', // 开学时间, 时间戳, 13位长度string
    //   startWithSunday: false, // 是否以周日为起始日, 设为true时会覆盖showWeekend
    //   showWeekend: true, // 是否显示周末
    //   forenoon: 1, // 上午节数, [1, 10]之间的int
    //   afternoon: 1, // 下午节数, [0, 10]之间的int
    //   night: 1, // 晚上节数, [0, 10]之间的int
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
    //   ], // 时间表，节数要和上边配置的节数相同
    // };
    if (tryTimetable === undefined) {
      logFrame.log(`获取时间表失败, 将跳过获取时间表<br />`);
    }
  } catch (err) {
    logFrame.log(`获取时间表失败: "${err?.message ?? err}", 将跳过获取时间表<br />`);
  }
  const timetable = tryTimetable ?? {};

  if (typeof timetable === "object" && Object.keys(timetable).length === 0) {
    logFrame.log("没有配置时间表 <br />");
  } else {
    logFrame.log(`获取到${timetable?.sections?.length}节课 `, logFrame.copyButton(JSON.stringify(timetable)), "<br />");
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

}