/**
 * parser 不做处理/校验, 仅转发
 * @param {string} str 来自provider
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
 * }} 课程表数组
 */
function scheduleHtmlParser(str) {
  const providerRes = JSON.parse(str); // 格式: { courses: courseInfos, timetable: timerRes }
  return { courseInfos: providerRes.courses };
}