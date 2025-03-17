/* 通用课程表后处理 v0.4 */

// unresolved: courses有效性校验(key是否存在, value是否格式匹配, number[]是否按顺序)
function coursesCheck(courses) {

}

// 合并重复&冲突课程
function coursesMergeConflictsAndDuplicates(courses, separator = "&") {
  let courseMap = {};
  for (const course of courses) {
    for (const week of course.weeks) {
      for (const section of course.sections) { // 拆成多门单周、单节课
        const keyObject = { // weeks day sections相同即为重复或冲突课程
          weeks: [week],
          day: course.day,
          sections: [section],
        }
        const key = JSON.stringify(keyObject);
        const key2Object = { // name position teacher相同即为重复课程, 不同即为冲突课程
          name: course.name,
          position: course.position,
          teacher: course.teacher,
        }
        const key2 = JSON.stringify(key2Object);
        const courseSplit = Object.assign({}, key2Object, keyObject)
        if (!courseMap[key]) courseMap[key] = {};
        courseMap[key][key2] = courseSplit; // 重复课程被覆盖, 因此去重
      }
    }
  }

  let courseMap2 = {};
  for (const [key2, courseSplitMap] of Object.entries(courseMap)) { // courseSplitMap里都是冲突课程
    const { day, weeks, sections } = JSON.parse(key2);

    // 冲突课程name position teacher合并
    let nameMerged = [];
    let positionMerged = [];
    let teacherMerged = [];
    for (const { name, position, teacher } of Object.values(courseSplitMap)) {
      nameMerged.push(name);
      positionMerged.push(position);
      teacherMerged.push(teacher);
    };
    const name = nameMerged.join(separator);
    const position = positionMerged.join(separator);
    const teacher = teacherMerged.join(separator);

    // 多节相同课程合并为一节连续节数课程
    const course = {
      name: name,
      position: position,
      teacher: teacher,
      weeks: weeks,
      day: day,
    }
    const key3 = JSON.stringify(course); // name position teacher weeks day相同即为相同课程
    if (!courseMap2[key3]) { courseMap2[key3] = course }
    else {
      courseMap2[key3].sections = Array.from(new Set(courseMap2[key3].sections.concat(sections))).sort((a, b) => a - b); // sections合并, 去重, 排序
    }
  }

  return Object.values(courseMap2);
}

// 合并不同周数的相同课程
function coursesMergeWeeks(courses) {
  const coursesCopy = JSON.parse(JSON.stringify(courses))
  let courseMap = {};
  for (const course of coursesCopy) {
    const key = JSON.stringify({ // name position teacher day sections相同即为相同课程
      name: course.name,
      position: course.position,
      teacher: course.teacher,
      day: course.day,
      sections: course.sections,
    });
    if (!courseMap[key]) { courseMap[key] = course }
    else {
      courseMap[key].weeks = Array.from(new Set(courseMap[key].weeks.concat(course.weeks))).sort((a, b) => a - b); // weeks合并, 去重, 排序
    }
  }
  return Object.values(courseMap);
}

// 合并不同教师的相同课程
function coursesMergeTeachers(courses) {
  let coursesNew = JSON.parse(JSON.stringify(courses));
  for (let c = 0; c < coursesNew.length; c++) {
    if (!coursesNew[c]) continue;
    for (let cc = c + 1; cc < coursesNew.length; cc++) {
      if (coursesNew[cc]
        && coursesNew[cc].name === coursesNew[c].name
        && coursesNew[cc].sections.length === coursesNew[c].sections.length
        && coursesNew[cc].sections[0] === coursesNew[c].sections[0]
        && coursesNew[cc].day === coursesNew[c].day
        && coursesNew[cc].position === coursesNew[c].position) {
        // console.log("教师合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
        coursesNew[c].teacher = (coursesNew[c].teacher.match(/^[0-9,]{1,}周:/) ? coursesNew[c].teacher : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].teacher) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].teacher);
        coursesNew[c].weeks = coursesNew[c].weeks.concat(coursesNew[cc].weeks);
        coursesNew.splice(cc, 1);
        // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
      }
      if (coursesNew.length <= maxCourses) break;
    }
    if (coursesNew.length <= maxCourses) break;
  }
  return coursesNew;
}

// 合并不同教室的相同课程
function coursesMergeClassrooms(courses) {
  let coursesNew = JSON.parse(JSON.stringify(courses));
  for (let c = 0; c < coursesNew.length; c++) {
    if (!coursesNew[c]) continue;
    for (let cc = c + 1; cc < coursesNew.length; cc++) {
      if (coursesNew[cc]
        && coursesNew[cc].name === coursesNew[c].name
        && coursesNew[cc].sections.length === coursesNew[c].sections.length
        && coursesNew[cc].sections[0] === coursesNew[c].sections[0]
        && coursesNew[cc].day === coursesNew[c].day) {
        // console.log("教室合并\n" + JSON.stringify(coursesNew[cc]) + "\n" + JSON.stringify(coursesNew[c]));
        coursesNew[c].position = (coursesNew[c].position.match(/^[0-9,]{1,}周:/) ? coursesNew[c].position : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].position) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].position);
        coursesNew[c].teacher = (coursesNew[c].teacher.match(/^[0-9,]{1,}周:/) ? coursesNew[c].teacher : (coursesNew[c].weeks.join(",") + "周:") + coursesNew[c].teacher) + " " + (coursesNew[cc].weeks.join(",") + "周:" + coursesNew[cc].teacher);
        coursesNew[c].weeks = coursesNew[c].weeks.concat(coursesNew[cc].weeks);
        coursesNew.splice(cc, 1);
        // console.log("合并后\n" + JSON.stringify(coursesNew[c]));
      }
      if (coursesNew.length <= maxCourses) break;
    }
    if (coursesNew.length <= maxCourses) break;
  }
  return coursesNew;
}