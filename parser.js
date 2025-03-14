/**
 * parser
 * @param {string} providerRes 课程表数组字符串
 * @returns {{
 *   name: string,
 *   position: string,
 *   teacher: string,
 *   weeks: number[],
 *   day: number,
 *   sections: number[],
 * }[]} 课程表数组
 */
function scheduleHtmlParser(providerRes) {
  return JSON.parse(providerRes).schedule;
}