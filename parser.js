/**
 * parser
 * @param {string} jsonString 课程表数组字符串
 * @returns {{
 *   name: string,
 *   position: string,
 *   teacher: string,
 *   weeks: number[],
 *   day: number,
 *   sections: number[],
 * }[]} 课程表数组
 */
function scheduleHtmlParser(jsonString) {
    return JSON.parse(jsonString);
}