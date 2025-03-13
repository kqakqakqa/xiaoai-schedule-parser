function scheduleHtmlParser(html) {
    let result = [];
    const $ = cheerio.load(html, { decodeEntities: false });
    let layer2s = $(html).find("#kblist_table tbody"); // 列表模式，无需手动切换
    /*
    layer2:<tbody>组成的list
    第一个<tbody>无用
    */
    let day, sections;
    for (let layer2 of layer2s) { // undone: 第一个<tbody>无用
        let layer3 = layer2.children;
        /*
        layer3:<tr>组成的list
        第一个<tr>无用
        */
        for (let layer3Traverse = 1; layer3Traverse < layer3.length; layer3Traverse++) {
            let layer4 = layer3[layer3Traverse].children;
            /*
            layer4:<td>组成的list
            分两种:
            1.
                <td id="jc_1-3-4" rowspan="1">
                    <span class="festival">3-4</span>
                </td>
            2.
                <td>
                    <div class="timetable_con text-left">...</div>
                </td>
            */
            for (let layer4Traverse = 0; layer4Traverse < layer4.length; layer4Traverse++) {
                let layer5 = layer4[layer4Traverse];
                /*
                layer5:一个<td>
                分两种情况
                */
                if (layer5.attribs.id != undefined) { //读取到新的节次
                    //提取节次包含的信息，覆盖旧的
                    //day(星期)
                    day = parseInt(layer5.attribs.id.split(/[_-]/)[1]);
                    //sections(节次)
                    sections = parseSections($(layer5).text());
                }
                else { //读取到课程
                    /*
                    <td>
                        <div class="timetable_con text-left">
                            <span class="title">
                                <font>
                                    篮球
                                </font>
                            </span>
                            <p>
                            <font>
                                <span class="glyphicon glyphicon-calendar"></span>
                                周数：4-6周(双),7-11周,13-18周
                            </font>
                            <font>
                                <span class="glyphicon glyphicon-tower"></span>
                                校区：旗山校区
                                <span class="glyphicon glyphicon-map-marker"></span>
                                上课地点：篮球场
                            </font>
                            <font>
                                <span class="glyphicon glyphicon-user"></span>
                                教师：金林
                            </font>
                            ...
                    */
                    //name
                    let courseName = $(layer5.children[0].children[0]).text();
                    //weeks
                    let weeksString = $(layer5.children[0].children[1].children[0]).text();
                    let weeks = parseWeeks(weeksString);
                    //position
                    let positionPart1 = $(layer5.children[0].children[1].children[1]).text().split(/[：\s]/)[2];
                    let positionPart2 = $(layer5.children[0].children[1].children[1]).text().split(/[：\s]/)[4];
                    let position = positionPart1 + " " + positionPart2;
                    //teacher
                    let teacher = $(layer5.children[0].children[1].children[2]).text().split("：")[1];
                    //整合，输出
                    result.push({
                        name: courseName,
                        position: position,
                        teacher: teacher,
                        weeks: weeks,
                        day: day,
                        sections: sections,
                    });
                }
            }
        }
    }
    return result;

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
}