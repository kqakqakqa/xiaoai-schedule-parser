/**
 * 新正方节次解析
 * @param {string} sectionsString eg: "1-4"
 * @returns {number[]} eg: [1,2,3,4]
 */
function parseSections(sectionsString) { // 
    let sections = [];
    const range = sectionsString.split("-");
    const start = parseInt(range[0]);
    const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
    for (let s = start; s <= end; s++) {
        sections.push(s);
    }
    return sections;
}