/**
 * 新正方节次解析
 * @version 0.6
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