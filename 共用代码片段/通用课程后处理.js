/**
 * 通用课程后处理
 * @version 0.9
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
  function mergeConflictsAndDuplicates(courses) {
    const coursesCopy = JSON.parse(JSON.stringify(courses));
    const courseMap = {};

    for (const course of coursesCopy) {
      for (const week of course.weeks) {
        for (const section of course.sections) { // 拆成多门单周、单节课程

          const courseSplit2 = JSON.stringify({
            name: course.name,
            position: course.position,
            teacher: course.teacher,
          });
          const courseSplit1 = {
            weeks: [week], // 单周
            day: course.day,
            sections: [section], // 单节
            courseSplit2s: [courseSplit2],
          }
          const key = JSON.stringify(courseSplit1);

          if (!courseMap[key]) courseMap[key] = courseSplit1;
          if (!courseMap[key].courseSplit2s.includes(courseSplit2)) { // 舍弃重复课程, 合并冲突课程
            courseMap[key].name += "," + course.name;
            courseMap[key].position += "," + course.position;
            courseMap[key].teacher += "," + course.teacher;
          }

        }
      }
    }

    const courses2 = Object.values(courseMap).sort((a, b) => { // 排序
      if (a.weeks[0] > b.weeks[0]) return (a.weeks[0] - b.weeks[0]);
      if (a.day > b.day) return (a.day - b.day);
      if (a.sections[0] > b.sections[0]) return (a.sections[0] - b.sections[0]);
    });

    const courses3 = [];
    for (const course of courses2) { // 合并连续节次的课程
      const key = JSON.stringify({ // name position teacher weeks day相同即为相同课程
        name: course.name,
        position: course.position,
        teacher: course.teacher,
        weeks: course.weeks,
        day: course.day,
      });
      if (
        courses3[courses3.length - 1]?.key === key &&
        courses3[courses3.length - 1]?.sections?.includes(course.sections[0] - 1)
      ) {
        courses3[courses3.length - 1].sections.push(course.sections[0]);
      } else {
        courses3.push(course);
        courses3[courses3.length - 1].key = key;
      };
    }

    const courses4 = courses3.map(course => {
      delete course.courseSplit2s;
      delete course.key;
      return course;
    })

    return courses4;
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
      } else { // weeks合并, 去重, 排序
        courseMap[key].weeks = Array.from(new Set(courseMap[key].weeks.concat(course.weeks))).sort((a, b) => a - b);
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
        courseMap[key].positions = [];
        courseMap[key].teachers = [];
      }
      if (mergePositions) courseMap[key].positions[course.position] = Array.from(new Set(courseMap[key].positions[course.position].concat(course.weeks))).sort((a, b) => a - b); // position合并, position对应周数合并, 去重, 排序
      if (mergeTeachers) courseMap[key].teachers[course.teacher] = Array.from(new Set(courseMap[key].teachers[course.teacher].concat(course.weeks))).sort((a, b) => a - b); // teacher合并, teacher对应周数合并, 去重, 排序

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