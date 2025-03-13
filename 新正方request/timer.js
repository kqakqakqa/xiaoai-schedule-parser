function scheduleTimer({ providerRes, parserRes } = {}) {
    return {
        totalWeek: 20, // 总周数：[1, 30]之间的整数
        startSemester: '', // 开学时间：时间戳，13位长度字符串，推荐用代码生成
        startWithSunday: false, // 是否是周日为起始日，该选项为true时，会开启显示周末选项
        showWeekend: true, // 是否显示周末
        forenoon: 5, // 上午课程节数：[1, 10]之间的整数
        afternoon: 4, // 下午课程节数：[0, 10]之间的整数
        night: 3, // 晚间课程节数：[0, 10]之间的整数
        sections: [
            {
                section: 1,
                startTime: "08:20",
                endTime: "09:00",
            },
            {
                section: 2,
                startTime: "09:05",
                endTime: "09:45",
            },
            {
                section: 3,
                startTime: "09:55",
                endTime: "10:35",
            },
            {
                section: 4,
                startTime: "10:40",
                endTime: "11:20",
            },
            {
                section: 5,
                startTime: "11:25",
                endTime: "12:05",
            },
            {
                section: 6,
                startTime: "14:00",
                endTime: "14:40",
            },
            {
                section: 7,
                startTime: "14:45",
                endTime: "15:25",
            },
            {
                section: 8,
                startTime: "15:30",
                endTime: "16:10",
            },
            {
                section: 9,
                startTime: "16:15",
                endTime: "16:55",
            },
            {
                section: 10,
                startTime: "18:30",
                endTime: "19:10",
            },
            {
                section: 11,
                startTime: "19:15",
                endTime: "19:55",
            },
            {
                section: 12,
                startTime: "20:00",
                endTime: "20:40",
            }
        ], // 课程时间表，注意：总长度要和上边配置的节数加和对齐
    };
}