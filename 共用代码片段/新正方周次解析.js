/**
 * 新正方周次解析
 * @version 0.7
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