/**
 * 新正方节次解析
 * @version 0.5
 * @param {string} sectionsString eg: "1-4"
 * @returns {number[]} eg: [1,2,3,4]
 */
function parseSections(sectionsString) { // unresolved: sectionsString识别失败时的输出; 如果格式是"1-4节,6-8节"怎么办
  let sections = [];
  const range = sectionsString.replace(/节$/g, "").split("-"); // 以防万一存在"节"
  const start = parseInt(range[0]);
  const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
  for (let s = start; s <= end; s++) {
    sections.push(s);
  }
  return sections;
}