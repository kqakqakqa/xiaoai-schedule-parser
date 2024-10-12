async function scheduleHtmlProvider() {
    let ajaxForm = document.querySelector("#ajaxForm");
    let messages = document.createElement("div");
    ajaxForm.append(messages);
    messages.innerHTML += "开始获取课表<br />";

    const params = `?xnm=${document.querySelector("#xnm").value}&xqm=${document.querySelector("#xqm").value}&kzlx=ck`;
    const url = "/jwglxt/kbcx/xskbcx_cxXsgrkb.html";
    messages.innerHTML += "已设置参数（url, params）<br />";

    messages.innerHTML += "准备发送获取数据请求，请等待课表数据返回（ajax）<br />";
    let scheduleRawJson = await ajax(url + params);
    messages.innerHTML += "已获取课表数据<br />";

    // return json;
    let scheduleJson = scheduleHtmlParser(scheduleRawJson);
    let schedule = JSON.parse(scheduleJson);
    const courseCount = schedule.length;
    messages.innerHTML += "共" + courseCount + "节课<br />";
    if (courseCount > maxCourses) {
        messages.innerHTML += "<span style='color: red;'>课程数量超过了小爱课程表能导入的上限...请选择要导入的范围：</span><br />";
    }
    rangeStartOnInput = function rangeStartOnInput(e) {
        let start = e.target.value;
        e.target.querySelector("span").innerHTML = showRangeEnd(schedule, start);

        function showRangeEnd(schedule, start) {
            // schedule.find(e=>e.)
        }
    }


    messages.innerHTML += "3秒后开始导入<br /><br />";
    messages.innerHTML += scheduleJson;

    await new Promise(resolve => {
        setTimeout(resolve, 3000);
    });

    return scheduleJson;
}

function ajax(url) {
    return new Promise(resolve => {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", url);
        xhr.onload = () => {
            resolve(xhr.response);
        }
        xhr.send();
    });
}

function rangeStartOnInput() { }














const maxCourses = 150;

function scheduleHtmlParser(scheduleRawJson) { // 主函数
    let kbList = JSON.parse(scheduleRawJson)["kbList"];
    // console.log(kbList)
    let scheduleRaw = [];
    for (let course of kbList) {
        scheduleRaw.push({
            name: course["kcmc"] ?? "-", // 课程名称
            position: course["cdmc"] ?? "-", // 上课地点
            teacher: course["xm"] ?? "-", // 教师姓名
            weeks: weeksAnalyzer(course["zcd"]), // 上课周次（第几周）
            day: course["xqj"], // 星期几（的周几）
            sections: sectionsAnalyzer(course["jcs"]) // 上课节次（的第几节）
        });
    }
    // console.log(scheduleRaw);

    let schedule1 = scheduleResolveConflicts(scheduleRaw); // 处理冲突课程
    // console.log(scheduleNoConflict);
    let schedule2 = scheduleMergeWeeks(schedule1); // 合并不同周的相同课程
    // console.log(scheduleMergedWeeks);
    return schedule2;
}

function weeksAnalyzer(weeksString) { // eg: "4-6周(双),7-11周,13周"
    let weeksRaw = weeksString.split(","); // eg: ["4-6周(双)",...]
    let weeks = [];
    for (let weeksPart of weeksRaw) { // eg: "4-6周(双)"
        let weeksPartSplit = weeksPart.split("周"); // eg: ["4-6","(双)"]
        let weeksPartStartEnd = weeksPartSplit[0].split("-"); // eg: ["4","6"]
        if (!weeksPartStartEnd[1]) { // 只有一周
            weeks.push(Number(weeksPartStartEnd[0]));
            continue;
        }
        let evenWeeks = (weeksPartSplit[1] == "(双)" || !weeksPartSplit[1]); // 双周 or 不分单双周
        let oddWeeks = (weeksPartSplit[1] == "(单)" || !weeksPartSplit[1]); // 单周 or 不分单双周
        for (let w = Number(weeksPartStartEnd[0]); w <= Number(weeksPartStartEnd[1]); w++) { // 填充 weeks 的 start-end 之间
            if ((!(w % 2) && evenWeeks) || ((w % 2) && oddWeeks)) weeks.push(w);
        }
    }
    return weeks;
}

function sectionsAnalyzer(sectionsString) {
    let sectionsStartEnd = sectionsString.split("-");
    if (!sectionsStartEnd[1]) {
        return [{ "section": Number(sectionsStartEnd[0]) }];
    }
    sections = [];
    for (let s = Number(sectionsStartEnd[0]); s <= sectionsStartEnd[1]; s++) {
        sections.push({ "section": s });
    }
    return sections;
}

function scheduleResolveConflicts(schedule) {
    // slice courses & resolve conflicts
    let scheduleOrdered = [];
    let changePointsOrdered = [];
    for (let course of schedule) {
        let weeks = course["weeks"];
        let day = course["day"];
        let sections = course["sections"];
        for (let week of weeks) {
            if (!scheduleOrdered[week]) scheduleOrdered[week] = [];
            if (!scheduleOrdered[week][day]) scheduleOrdered[week][day] = [];
            for (let sectionJson of sections) {
                let section = sectionJson["section"];
                const conflictCourse = scheduleOrdered[week][day][section];
                scheduleOrdered[week][day][section] = conflictCourse ?
                    {
                        name: conflictCourse["name"] + "&" + course["name"],
                        position: conflictCourse["position"] + "&" + course["position"],
                        teacher: conflictCourse["teacher"] + "&" + course["teacher"]
                    } :
                    {
                        name: course["name"],
                        position: course["position"],
                        teacher: course["teacher"]
                    };
            }

            if (!changePointsOrdered[week]) changePointsOrdered[week] = [];
            if (!changePointsOrdered[week][day]) changePointsOrdered[week][day] = [];
            let changePoint = sections[0]["section"];
            let nextChangePoint = sections[sections.length - 1]["section"] + 1;
            changePointsOrdered[week][day].push(changePoint);
            changePointsOrdered[week][day].push(nextChangePoint);
            changePointsOrdered[week][day] = Array.from(new Set(changePointsOrdered[week][day])).sort((a, b) => (a - b));
        }
    }
    // console.log(scheduleOrdered);
    // console.log(changePointsOrdered);

    // merge courses
    let scheduleNoConflict = [];
    for (let w = 1; w < scheduleOrdered.length; w++) {
        if (!scheduleOrdered[w]) continue;
        for (let d = 1; d < scheduleOrdered[w].length; d++) {
            let changePointsDay = changePointsOrdered[w][d];
            if (!changePointsDay) continue;

            for (let ckpt = 0; ckpt < changePointsDay.length - 1; ckpt++) {
                let changePoint = changePointsOrdered[w][d][ckpt];
                let nextChangePoint = changePointsOrdered[w][d][ckpt + 1];
                // if (changePoint == nextChangePoint) continue;
                let courseOrdered = scheduleOrdered[w][d][changePoint];
                if (!courseOrdered) continue;
                let sections = [];
                for (var s = changePoint; s < nextChangePoint; s++) {
                    sections.push({ "section": s });
                }
                scheduleNoConflict.push({
                    name: courseOrdered["name"],
                    position: courseOrdered["position"],
                    teacher: courseOrdered["teacher"],
                    weeks: [w],
                    day: d,
                    sections: sections
                })
            }
        }
    }
    return scheduleNoConflict;
}

function scheduleMergeWeeks(schedule) {
    let scheduleNew = schedule;
    for (let c = 0; c < scheduleNew.length; c++) {
        let courseCompare1 = scheduleNew[c];
        if (!courseCompare1) continue;
        for (let cc = c + 1; cc < scheduleNew.length; cc++) {
            let courseCompare2 = scheduleNew[cc];
            if (!courseCompare2) continue;
            const sameCourse = courseCompare2["name"] == courseCompare1["name"]
                && courseCompare2["sections"].length == courseCompare1["sections"].length
                && courseCompare2["sections"][0]["section"] == courseCompare1["sections"][0]["section"]
                && courseCompare2["day"] == courseCompare1["day"]
                && courseCompare2["position"] == courseCompare1["position"]
                && courseCompare2["teacher"] == courseCompare1["teacher"];
            if (sameCourse) {
                // console.log("周合并\n" + JSON.stringify(courseCompare2) + "\n" + JSON.stringify(courseCompare1));
                scheduleNew[c]["weeks"] = courseCompare1["weeks"].concat(courseCompare2["weeks"]);
                scheduleNew.splice(cc, 1);
                // console.log("合并后" + JSON.stringify(scheduleNew[c]));
            }
        }
    }
    return scheduleNew;
}