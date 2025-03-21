/**
 * 通用课程后处理
 * @version 0.6
 */
function coursesPostProcessings() {
  return {
    check: check,
    mergeConflictsAndDuplicates: mergeConflictsAndDuplicates,
    mergeWeeks: mergeWeeks,
    mergeTeachersOrPositions: mergeTeachersOrPositions,
  };


  // 有效性校验
  function check(courses) { // todo: courses有效性校验(key是否存在, value是否格式匹配, number[]是否按顺序)
    return courses;
  }


  // 合并重复&冲突课程
  function mergeConflictsAndDuplicates(courses, separator = "&") {
    const courseMap = {};
    for (const course of courses) {
      for (const week of course.weeks) {
        for (const section of course.sections) { // 拆成多门单周、单节课程
          const keyObject = { // weeks day sections相同即为重复或冲突课程
            weeks: [week],
            day: course.day,
            sections: [section],
          };
          const key = JSON.stringify(keyObject);
          const key2Object = { // name position teacher相同即为重复课程, 不同即为冲突课程
            name: course.name,
            position: course.position,
            teacher: course.teacher,
          };
          const key2 = JSON.stringify(key2Object);
          const courseSplit = Object.assign({}, key2Object, keyObject);
          if (!courseMap[key]) courseMap[key] = {};
          courseMap[key][key2] = courseSplit; // 重复课程被覆盖, 因此去重
        }
      }
    }

    const courseMap2 = {};
    for (const [key2, courseSplitMap] of Object.entries(courseMap)) { // courseSplitMap里都是冲突课程
      const { day, weeks, sections } = JSON.parse(key2);

      // 冲突课程name position teacher合并
      const nameMerged = [];
      const positionMerged = [];
      const teacherMerged = [];
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
      };
      const key3 = JSON.stringify(course); // name position teacher weeks day相同即为相同课程
      if (!courseMap2[key3]) { courseMap2[key3] = course; }
      else {
        courseMap2[key3].sections = Array.from(new Set(courseMap2[key3].sections.concat(sections))).sort((a, b) => a - b); // sections合并, 去重, 排序
      }
    }

    return Object.values(courseMap2);
  }


  // 合并不同周数的相同课程
  function mergeWeeks(courses) {
    const coursesCopy = JSON.parse(JSON.stringify(courses));
    const courseMap = {};

    for (const course of coursesCopy) {
      const key = JSON.stringify({ // name position teacher day sections相同即为相同课程
        name: course.name,
        position: course.position,
        teacher: course.teacher,
        day: course.day,
        sections: course.sections,
      });

      if (!courseMap[key]) {
        courseMap[key] = course;
      } else {
        courseMap[key].weeks = Array.from(new Set(courseMap[key].weeks.concat(course.weeks))).sort((a, b) => a - b); // weeks合并, 去重, 排序
      }

    }

    return Object.values(courseMap);
  }


  // 可选: 合并不同教师或教室的相同课程
  function mergeTeachersOrPositions(courses, mergePositions = true, mergeTeachers = true) {
    const coursesCopy = JSON.parse(JSON.stringify(courses));
    const courseMap = {};

    for (const course of coursesCopy) {
      const key = JSON.stringify({ // name position(根据条件) teacher(根据条件) weeks day sections相同即为相同课程
        name: course.name,
        position: mergePositions || course.position,
        teacher: mergeTeachers || course.teacher,
        weeks: course.weeks,
        day: course.day,
        sections: course.sections,
      });

      if (!courseMap[key]) {
        courseMap[key] = course;
        if (mergePositions) courseMap[key].positions = { [course.position]: course.weeks };
        if (mergeTeachers) courseMap[key].teachers = { [course.teacher]: course.weeks };
      } else {
        if (mergePositions) courseMap[key].positions[course.position] = Array.from(new Set(courseMap[key].positions[course.position].concat(course.weeks))).sort((a, b) => a - b); // position合并, position对应周数合并, 去重, 排序
        if (mergeTeachers) courseMap[key].teachers[course.teacher] = Array.from(new Set(courseMap[key].teachers[course.teacher].concat(course.weeks))).sort((a, b) => a - b); // teacher合并, teacher对应周数合并, 去重, 排序
      }

    }

    // 改回正确格式
    const coursesNew = Object.values(courseMap).map(course => {
      if (mergePositions) {
        course.position = Object.entries(course.positions).map(([position, weeks]) => position + "(" + weeks.join(",") + "周)").join(" "); // eg. "教室A(1,2周) 教室B(3周)"
        delete course.positions;
      }
      if (mergeTeachers) {
        course.teacher = Object.entries(course.teachers).map(([teacher, weeks]) => teacher + "(" + weeks.join(",") + "周)").join(" "); // eg. "教师A(1,2周) 教师B(3周)"
        delete course.teachers;
      }
      return course;
    });

    return coursesNew;
  }

}