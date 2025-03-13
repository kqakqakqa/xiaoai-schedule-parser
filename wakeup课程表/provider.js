/* provider */

async function scheduleHtmlProvider() {
    document.getElementById("xiaoai-schedule-provider-log")?.remove();
    document.body.innerHTML += "<div id='xiaoai-schedule-provider-log'></div>";
    let messages = document.getElementById("xiaoai-schedule-provider-log");
    function LogToUser(msg) {
        console.log(msg);
        messages.innerHTML += msg.replaceAll("\n", "<br />");
    }

    LogToUser("<input type='text' id='shareKey' placeholder='请输入分享口令'/><button id='submitShareKey'>继续</button>\n");
    let shareKey = document.getElementById("shareKey");
    let submitShareKey = document.getElementById("submitShareKey");
    const shareCode = await new Promise(resolve => {
        submitShareKey.addEventListener("click", () => resolve(shareKey.value), { once: true });
    });
    LogToUser("开始获取课表\n");

    LogToUser("设置参数（url, headers）...");
    const url = `https://i.wakeup.fun/share_schedule/get?key=${shareCode}`;
    const headers = {
        "User-Agent": "okhttp/3.14.9",
        "Connection": "Keep-Alive",
        "Accept-Encoding": "gzip",
        "version": "243",
    };
    LogToUser("完成！\n");

    LogToUser("发送获取数据请求（fetch），等待课表数据返回...");
    const response = await fetch(url, { method: "GET", headers: headers });
    const rawText = await response.text();
    LogToUser("完成！长度" + rawText.length + "<button id='copyScheduleHtml'>点击复制</button>\n");
    document.querySelector("#copyScheduleHtml").onclick = async () => await navigator.clipboard.writeText(rawText);

    LogToUser("识别课程表...");
    const parsed = scheduleHtmlParser(rawText, LogToUser); // return rawText;
    if (parsed !== "do not continue") {
        LogToUser("完成！共" + JSON.parse(parsed).length + "节课<button id='copySchedule'>点击复制</button>\n\n");
        document.querySelector("#copySchedule").onclick = async () => await navigator.clipboard.writeText(parsed);
    }

    LogToUser("3秒后进入下一步");
    await new Promise(e => setTimeout(e, 3000));
    return parsed;
}

/* parser */

const maxCourses = 150;

function scheduleHtmlParser(html, LogToUser) { // 主函数
    const rawData = JSON.parse(html)?.data?.split("\n");
    if (rawData.length !== 5) {
        LogToUser("识别失败了...原因：返回的数据不符合预期格式。\n\n");
        return "do not continue";
    }
    const rawTimes = JSON.parse(rawData[1]);
    const rawCourseMaps = JSON.parse(rawData[3]);
    const rawCourses = JSON.parse(rawData[4]);
    LogToUser("读取到" + rawCourses.length + "节课");

    LogToUser("格式转换...");
    let courses = [];
    for (const section of rawCourses) {
        const name = rawCourseMaps.find(e => (e.id === section.id)).courseName;
        courses.push({
            name: name ?? "-", // 课程名称
            position: section.room ?? "-", // 上课地点
            teacher: section.teacher ?? "-", // 教师姓名
            weeks: weeksAnalyzer(section), // 上课周次（第几周）
            day: section.day, // 星期几（的周几）
            sections: sectionsAnalyzer(section) // 上课节次（的第几节）
        });
    }
    LogToUser("完成！转换了" + courses.length + "节课\n");
    // console.log(coursesRaw);

    LogToUser("处理冲突课程...");
    const courses1 = coursesResolveConflicts(courses);
    LogToUser("完成！处理后还有" + courses1.length + "节课\n");
    // console.log(courses1);

    LogToUser("合并不同周的相同课程...");
    const courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
    LogToUser("完成！合并后还有" + courses2.length + "节课\n");
    // console.log(courses2);

    LogToUser("合并不同教师的相同课程...");
    const courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
    LogToUser("完成！合并后还有" + courses3.length + "节课\n");
    // console.log(courses3);

    LogToUser("合并不同教室的相同课程...");
    const courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
    LogToUser("完成！合并后还有" + courses4.length + "节课\n");
    // console.log(courses4);

    return JSON.stringify(courses4);
}

function weeksAnalyzer(course) {
    let weeks = [];
    const weekStart = course.startWeek;
    const weekEnd = course.endWeek;
    for (let w = weekStart; w <= weekEnd; w++) weeks.push(w);
    return weeks;
}

function sectionsAnalyzer(course) {
    let sections = [];
    const sectionStart = course.startNode;
    const sectionEnd = course.startNode + course.step - 1;
    for (let s = sectionStart; s <= sectionEnd; s++) sections.push({ "section": s });
    return sections;
}

/* 通用课程表后处理 v0.1.kqa */

function coursesResolveConflicts(courses) {
    let coursesOrdered = [];
    let changePointsOrdered = [];
    for (const course of courses) {
        const weeks = course["weeks"];
        const day = course["day"];
        const sections = course["sections"];
        for (const week of weeks) {
            if (!coursesOrdered[week]) coursesOrdered[week] = [];
            if (!coursesOrdered[week][day]) coursesOrdered[week][day] = [];
            for (const sectionJson of sections) {
                const section = sectionJson["section"];
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
            const changePoint = sections[0]["section"];
            const nextChangePoint = sections[sections.length - 1]["section"] + 1;
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
            const changePointsDay = changePointsOrdered[w][d];
            if (!changePointsDay) continue;

            for (let ckpt = 0; ckpt < changePointsDay.length - 1; ckpt++) {
                let sections = [];
                const changePoint = changePointsOrdered[w][d][ckpt];
                const nextChangePoint = changePointsOrdered[w][d][ckpt + 1];
                // if (changePoint === nextChangePoint) continue;
                const courseOrdered = coursesOrdered[w][d][changePoint];
                if (!courseOrdered) continue;
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
    let coursesNew = JSON.parse(JSON.stringify(courses));
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] === coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] === coursesNew[c]["day"]
                && coursesNew[cc]["position"] === coursesNew[c]["position"]
                && coursesNew[cc]["teacher"] === coursesNew[c]["teacher"]) {
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
    let coursesNew = JSON.parse(JSON.stringify(courses));
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] === coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] === coursesNew[c]["day"]
                && coursesNew[cc]["position"] === coursesNew[c]["position"]) {
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
    let coursesNew = JSON.parse(JSON.stringify(courses));
    for (let c = 0; c < coursesNew.length; c++) {
        if (!coursesNew[c]) continue;
        for (let cc = c + 1; cc < coursesNew.length; cc++) {
            if (coursesNew[cc]
                && coursesNew[cc]["name"] === coursesNew[c]["name"]
                && coursesNew[cc]["sections"].length === coursesNew[c]["sections"].length
                && coursesNew[cc]["sections"][0]["section"] === coursesNew[c]["sections"][0]["section"]
                && coursesNew[cc]["day"] === coursesNew[c]["day"]) {
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
    return coursesNew;
}