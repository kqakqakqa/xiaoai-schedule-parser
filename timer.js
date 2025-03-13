async function scheduleTimer({ providerRes, parserRes } = {}) {
    const example = {
        totalWeek: 1, // 总周数：[1, 30]之间的整数
        startSemester: '', // 开学时间：时间戳，13位长度字符串，推荐用代码生成
        startWithSunday: false, // 是否是周日为起始日，该选项为true时，会开启显示周末选项
        showWeekend: true, // 是否显示周末
        forenoon: 1, // 上午课程节数：[1, 10]之间的整数
        afternoon: 1, // 下午课程节数：[0, 10]之间的整数
        night: 1, // 晚间课程节数：[0, 10]之间的整数
        sections: [
            {
                section: 1,
                startTime: "08:00",
                endTime: "12:00",
            },
            {
                section: 2,
                startTime: "12:00",
                endTime: "16:00",
            },
            {
                section: 3,
                startTime: "16:00",
                endTime: "20:00",
            }
        ], // 课程时间表，注意：总长度要和上边配置的节数加和对齐
    };

    return providerRes ?? parserRes ?? {};
    // return example;
}