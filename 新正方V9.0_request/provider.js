/* provider */
async function scheduleHtmlProvider() {
    const ajaxForm = document.querySelector("#ajaxForm");
    const messages = document.createElement("div");
    ajaxForm.append(messages);
    function LogToUser(msg) {
        console.log(msg);
        if (typeof msg === "string") {
            const element = document.createElement("div");
            element.innerHTML = msg;
            messages.append(...element.childNodes);
        }
        else {
            messages.append(msg);
        }
    }
    function createCopyButton(textToCopy) {
        const copyButton = document.createElement("button");
        copyButton.textContent = "点击复制";
        copyButton.addEventListener("click", async e => {
            await navigator.clipboard.writeText(textToCopy);
            e.target.textContent = "已复制";
        });
        return copyButton;
    }


    LogToUser("开始获取课表<br />");

    LogToUser("设置参数（url, params）...");
    const url = "/jwglxt/kbcx/xskbcx_cxXsgrkb.html";
    const params = `?xnm=${document.querySelector("#xnm").value}&xqm=${document.querySelector("#xqm").value}&kzlx=ck`;
    LogToUser("完成！<br />");

    LogToUser("发送获取数据请求（fetch），等待课表数据返回...");
    const json = await (await fetch(url + params)).text();
    LogToUser("完成！长度" + json.length);
    LogToUser(createCopyButton(json));
    LogToUser("<br />");

    LogToUser("识别课程表...");
    const parsed = scheduleHtmlParser(json, LogToUser); // return json;
    LogToUser("完成！共" + JSON.parse(parsed).length + "节课");
    LogToUser(createCopyButton(parsed));
    LogToUser("<br /><br />");

    LogToUser("3秒后进入下一步");
    await new Promise(e => setTimeout(e, 3000));
    return parsed;

    /* parser */
    function scheduleHtmlParser(html, LogToUser) {
        const maxCourses = 150;
        const kbList = JSON.parse(html)["kbList"];
        LogToUser("读取到" + kbList.length + "节课<br />");
        // console.log(kbList)

        LogToUser("格式转换...");
        let courses = [];
        for (const course of kbList) {
            courses.push({
                name: course["kcmc"] ?? "-", // 课程名称
                position: course["cdmc"] ?? "-", // 上课地点
                teacher: course["xm"] ?? "-", // 教师姓名
                weeks: parseWeeks(course["zcd"]), // 上课周次（第几周）
                day: course["xqj"], // 星期几（的周几）
                sections: parseSections(course["jcs"]) // 上课节次（的第几节）
            });
        }
        LogToUser("完成！转换了" + courses.length + "节课<br />");
        // console.log(coursesRaw);

        LogToUser("处理冲突课程...");
        const courses1 = coursesResolveConflicts(courses);
        LogToUser("完成！处理后还有" + courses1.length + "节课<br />");
        // console.log(courses1);

        LogToUser("合并不同周的相同课程...");
        const courses2 = coursesMergeWeeks(courses1); // 合并不同周的相同课程
        LogToUser("完成！合并后还有" + courses2.length + "节课<br />");
        // console.log(courses2);

        LogToUser("合并不同教师的相同课程...");
        const courses3 = (courses2.length > maxCourses) ? coursesMergeTeachers(courses2) : courses2; //如果课太多，就合并不同教师的相同课程
        LogToUser("完成！合并后还有" + courses3.length + "节课<br />");
        // console.log(courses3);

        LogToUser("合并不同教室的相同课程...");
        const courses4 = (courses3.length > maxCourses) ? coursesMergeClassrooms(courses3) : courses3; //如果课太多，就合并不同教室的相同课程
        LogToUser("完成！合并后还有" + courses4.length + "节课<br />");
        // console.log(courses4);

        return JSON.stringify(courses4);

        /**
         * 新正方周次解析 v0.3.kqa
         * @param {string} weeksString eg: "4-6周(双),7-11周,13周"
         * @returns {number[]} eg: [4,6,7,8,9,10,11,13]
         */
        function parseWeeks(weeksString) {
            let weeks = [];
            const weeksStringArray = weeksString.split(/[,，]/); // eg: ["4-6周(双)",...]
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
         * 新正方节次解析 v0.4.kqa
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

        /* 通用课程表后处理 v0.2.kqa */

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
                    for (const section of sections) {
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
                    const changePoint = sections[0];
                    const nextChangePoint = sections[sections.length - 1] + 1;
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
                            sections.push(s);
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
    }
}