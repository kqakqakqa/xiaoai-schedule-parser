/**
 * 新正方周次解析 v0.2.kqa
 * @param {string} weeksString eg: "4-6周(双),7-11周,13周"
 * @returns {number[]} eg: [4,6,7,8,9,10,11,13]
 */
function parseWeeks(weeksString) {
    let weeks = [];
    const weeksStringArray = weeksString.split(/[,，]/g); // eg: ["4-6周(双)",...]
    for (const weekRangeString of weeksStringArray) { // eg: "4-6周(双)"
        const weekRangeStringSplit = weekRangeString.split("周"); // eg: ["4-6","(双)"]
        const weekRange = weekRangeStringSplit[0].split("-"); // eg: ["4","6"]
        const weekStart = parseInt(weekRange[0]);
        const weekEnd = parseInt(weekRange[1] ?? weekRange[0]); // 只有一周就设置end为start
        const evenWeeks = (weekRangeStringSplit[1] === "(双)" || !weekRangeStringSplit[1]); // 双周 or 不分单双周
        const oddWeeks = (weekRangeStringSplit[1] === "(单)" || !weekRangeStringSplit[1]); // 单周 or 不分单双周
        for (let w = weekStart; w <= weekEnd; w++) { // 填充 weeks 的 start-end 之间
            if ((!(w % 2) && evenWeeks) || ((w % 2) && oddWeeks)) weeks.push(w);
        }
    }
    return weeks;
}

/**
 * 新正方节次解析 v0.2.kqa
 * @param {string} sectionsString eg: "1-4"
 * @returns {object[]} eg: [{ "section": 1 }, { "section": 2 }, { "section": 3 }, { "section": 4 }]
 */
function parseSections(sectionsString) { // 
    let sections = [];
    const range = sectionsString.split("-");
    const start = parseInt(range[0]);
    const end = parseInt(range[1] ?? range[0]); // 只有一节课则end=start
    for (let s = start; s <= end; s++) {
        sections.push({ "section": s });
    }
    return sections;
}

function getTime(str) {
    let t = str.split('节)')
    let weekStr = t[1].replace(/周/g, '');
    let weeks = getWeeks(weekStr)
    return [weeks, parseSections(t[0].replace('(', ''))]
}

function getWeeks(str) {
    let flag = 0
    if (str.search('单') != -1) {
        flag = 1
        str = str.replace('单', '')
    } else if (str.search('双') != -1) {
        flag = 2
        str = str.replace('双', '')
    }
    let weeks = parseWeeks(str)
    weeks = weeks.filter((v) => {
        if (flag === 1) {
            return v % 2 === 1
        } else if (flag === 2) {
            return v % 2 === 0
        }
        return v
    })
    return weeks
}



function scheduleHtmlParser(html) {
    let result = []
    if ($('#type').text() === 'list') {
        result = parseList(html)
    } else {
        result = parseTable(html)
    }
    // console.log(result.length)
    return { courseInfos: result }



    // 解析列表模式
    function parseList(html) {
        let result = []
        const $ = cheerio.load(html, { decodeEntities: false });
        $('#kblist_table').find('tbody').each(function (weekday) {
            if (weekday > 0) {
                $(this).find('tr').each(function (index) {
                    if (index > 0) {
                        let course = {}
                        $(this).find('td').each(function (i) {
                            if (i == 0) {
                                course.sections = parseSections($(this).text())
                            } else {
                                course.name = $(this).find('.title').text()
                                let info = []
                                $(this).find('p font').each(function () {
                                    let text = $(this).text().trim()
                                    if (text.search('上课地点') != -1) {
                                        text = text.replace('上课地点：', '')
                                    }
                                    info.push(text.split('：')[1])
                                })
                                let weekStr = info[0].replace(/周/g, '')
                                course.weeks = getWeeks(weekStr)
                                course.teacher = info[2]
                                course.position = info[1]
                                course.day = weekday
                            }
                        })
                        result.push(course)
                    }
                })
            }
        })
        console.log(result)
        return result
    }

    // 解析表格模式
    function parseTable(html) {
        const $ = cheerio.load(html, { decodeEntities: false });
        let result = []
        $('#kbgrid_table_0').find('td').each(function () {
            if ($(this).hasClass('td_wrap') && $(this).text().trim() !== '') {
                let info = []
                let weekday = parseInt($(this).attr('id').split('-')[0])
                $(this).find('font').each(function () {
                    let text = $(this).text().trim()
                    if (text !== '') {
                        info.push(text)
                    }
                })
                console.log(info)
                let hasNext = true
                let index = 0
                while (hasNext) {
                    let course = {}
                    course.name = info[index]
                    course.teacher = info[index + 3]
                    course.position = info[index + 2]
                    course.day = weekday
                    if (info[index + 1]) {
                        if (info[index + 1].split('节)')[1]) {
                            let [weeks, sections] = getTime(info[index + 1])
                            course.weeks = weeks
                            course.sections = sections
                            result.push(course)
                        }
                    }
                    if (info[index + 11] !== undefined) {
                        index += 11
                    } else {
                        hasNext = false
                    }
                }
            }
        })
        return result
    }
}