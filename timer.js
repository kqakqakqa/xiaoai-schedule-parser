/**
 * timer 不做处理/校验, 仅转发
 * @param {{
 *   providerRes:string,
 *   parserRes:Object,
 * }} res 来自provider和parser的数据, 其中parser没有传数据
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
async function scheduleTimer({ providerRes, parserRes } = {}) {
  const providerResObj = JSON.parse(providerRes); // 格式: { schedule: courseInfos, timetable: timerRes }
  return providerResObj.timetable;
}