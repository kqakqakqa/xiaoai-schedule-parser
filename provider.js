/* provider */

async function scheduleHtmlProvider() {
    let ajaxForm = document.querySelector("#ajaxForm");
    let messages = document.createElement("div");
    ajaxForm.append(messages);
    function LogToUser(msg) {
        console.log(msg);
        messages.innerHTML += msg.replaceAll("\n", "<br />");
    }
    LogToUser("开始获取课表\n");

    LogToUser("设置参数（url, params）...");
    let params = `?xnm=${document.querySelector("#xnm").value}&xqm=${document.querySelector("#xqm").value}&kzlx=ck`;
    let url = "/jwglxt/kbcx/xskbcx_cxXsgrkb.html";
    LogToUser("完成！\n");

    LogToUser("发送获取数据请求（ajax），等待课表数据返回...");
    let json = (await fetch(url + params)).text();
    LogToUser("完成！\n");

    LogToUser("识别课程表...");
    let parsed = scheduleHtmlParser(json, LogToUser); // return json;
    LogToUser("完成！共" + JSON.parse(parsed).length + "节课\n\n");
    LogToUser("3秒后进入下一步\n\n");
    LogToUser("<button id='copySchedule'>点击复制</button><span style='font-size:8px; font-family:monospace;'>" + parsed + "</span>");
    document.querySelector("#copySchedule").onclick = async () => await navigator.clipboard.writeText(parsed);

    await new Promise(e => setTimeout(e, 3000));
    return parsed;
}

/* parser */

const maxCourses = 150;

function scheduleHtmlParser(html, LogToUser) { // 主函数
    let kbList = JSON.parse(html)["kbList"];
    LogToUser("读取到" + kbList.length + "节课\n");
    // console.log(kbList)

    LogToUser("格式转换...");
    let coursesRaw = [];
    for (let course of kbList) {
        coursesRaw.push({
            name: course["kcmc"] ?? "-", // 课程名称
            position: course["cdmc"] ?? "-", // 上课地点
            teacher: course["xm"] ?? "-", // 教师姓名
            weeks: weeksAnalyzer(course["zcd"]), // 上课周次（第几周）
            day: course["xqj"], // 星期几（的周几）
            sections: sectionsAnalyzer(course["jcs"]) // 上课节次（的第几节）
        });
    }
    LogToUser("完成！转换了" + coursesRaw.length + "节课\n");
    // console.log(coursesRaw);

    LogToUser("处理冲突课程...");
    let courses1 = coursesResolveConflicts(coursesRaw);
    LogToUser("完成！处理后还有" + courses1.length + "节课\n");
    // console.log(courses1);

    LogToUser("合并不同周的相同课程...");
    let courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
    LogToUser("完成！合并后还有" + courses2.length + "节课\n");
    // console.log(courses2);

    LogToUser("合并不同教师的相同课程...");
    let courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
    LogToUser("完成！合并后还有" + courses3.length + "节课\n");
    // console.log(courses3);

    LogToUser("合并不同教室的相同课程...");
    let courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
    LogToUser("完成！合并后还有" + courses4.length + "节课\n");
    // console.log(courses4);

    return JSON.stringify(courses4);
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

/* 通用课程表后处理 v0.1 */

function coursesResolveConflicts(courses) {
    let coursesOrdered = [];
    let changePointsOrdered = [];
    for (let course of courses) {
        let weeks = course["weeks"];
        let day = course["day"];
        let sections = course["sections"];
        for (let week of weeks) {
            if (!coursesOrdered[week]) coursesOrdered[week] = [];
            if (!coursesOrdered[week][day]) coursesOrdered[week][day] = [];
            for (let sectionJson of sections) {
                let section = sectionJson["section"];
                if (!coursesOrdered[week][day][section]) {
                    coursesOrdered[week][day][section] = {
                        name: course["name"],
                        position: course["position"],
                        teacher: course["teacher"]
                    };
                }
                else {
                    coursesOrdered[week][day][section] = {
                        name: `${coursesOrdered[week][day][section]["name"]}&${course["name"]}`,
                        position: `${coursesOrdered[week][day][section]["position"]}&${course["position"]}`,
                        teacher: `${coursesOrdered[week][day][section]["teacher"]}&${course["teacher"]}`
                    };
                }
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

    // console.log(coursesOrdered);
    // console.log(changePointsOrdered);

    let coursesNoConflict = [];
    for (let w = 1; w < coursesOrdered.length; w++) {
        if (!coursesOrdered[w]) continue;
        for (let d = 1; d < coursesOrdered[w].length; d++) {
            let changePointsDay = changePointsOrdered[w][d];
            if (!changePointsDay) continue;

            for (let ckpt = 0; ckpt < changePointsDay.length - 1; ckpt++) {
                let changePoint = changePointsOrdered[w][d][ckpt];
                let nextChangePoint = changePointsOrdered[w][d][ckpt + 1];
                // if (changePoint == nextChangePoint) continue;
                let courseOrdered = coursesOrdered[w][d][changePoint];
                if (!courseOrdered) continue;
                let sections = [];
                for (var s = changePoint; s < nextChangePoint; s++) {
                    sections.push({ "section": s });
                }
                coursesNoConflict.push({
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
    return coursesNoConflict;
}

function coursesMergeWeeks(courses) {
    let coursesNew = courses;
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] == coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length == coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] == coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] == coursesNew[c]["day"]
                && coursesNew[cc]["position"] == coursesNew[c]["position"]
                && coursesNew[cc]["teacher"] == coursesNew[c]["teacher"]) {
                // console.log("周合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
                coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
                coursesNew.splice(cc, 1);
                // console.log("合并后" + JSON.stringify(coursesNew[c]));
            }
        }
    }
    return coursesNew;
}

function coursesMergeTeachers(courses) {
    let coursesNew = courses;
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] == coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length == coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] == coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] == coursesNew[c]["day"]
                && coursesNew[cc]["position"] == coursesNew[c]["position"]) {
                // console.log("教师合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
                coursesNew[c]["teacher"] = (coursesNew[c]["teacher"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["teacher"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["teacher"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["teacher"]);
                coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
                coursesNew.splice(cc, 1);
                // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
            }
            if (coursesNew.length <= maxCourses) break;
        }
        if (coursesNew.length <= maxCourses) break;
    }
    return coursesNew;
}

function coursesMergeClassrooms(courses) {
    let coursesNew = courses;
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] == coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length == coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] == coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] == coursesNew[c]["day"]) {
                // console.log("教室合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
                coursesNew[c]["position"] = (coursesNew[c]["position"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["position"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["position"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["position"]);
                coursesNew[c]["teacher"] = (coursesNew[c]["teacher"].match(/^[0-9,]{1,}周:/) ? coursesNew[c]["teacher"] : (coursesNew[c]["weeks"].join(",") + "周:") + coursesNew[c]["teacher"]) + " " + (coursesNew[cc]["weeks"].join(",") + "周:" + coursesNew[cc]["teacher"]);
                coursesNew[c]["weeks"] = coursesNew[c]["weeks"].concat(coursesNew[cc]["weeks"]);
                coursesNew.splice(cc, 1);
                // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
            }
            if (coursesNew.length <= maxCourses) break;
        }
        if (coursesNew.length <= maxCourses) break;
    }
    return JSON.stringify(coursesNew);
}