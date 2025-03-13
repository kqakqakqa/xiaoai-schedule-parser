const TIME_TABLE = [
    undefined,//索引从0开始
    { "section": 1, "startTime": "08:00", "endTime": "08:45" },
    { "section": 2, "startTime": "08:50", "endTime": "09:35" },
    { "section": 3, "startTime": "09:55", "endTime": "10:40" },
    { "section": 4, "startTime": "10:45", "endTime": "11:30" },
    { "section": 5, "startTime": "11:35", "endTime": "12:20" },
    { "section": 6, "startTime": "13:00", "endTime": "13:45" },
    { "section": 7, "startTime": "13:50", "endTime": "14:35" },
    { "section": 8, "startTime": "14:50", "endTime": "15:35" },
    { "section": 9, "startTime": "15:40", "endTime": "16:25" },
    { "section": 10, "startTime": "16:40", "endTime": "17:25" },
    { "section": 11, "startTime": "17:30", "endTime": "18:15" },
    { "section": 12, "startTime": "18:20", "endTime": "19:05" },
    { "section": 13, "startTime": "19:10", "endTime": "19:55" },
];
const CHAR2DAY = {
    '一': 1,
    '二': 2,
    '三': 3,
    '四': 4,
    '五': 5,
    '六': 6,
    '日': 7,
};

function parseTimeRanges(rawTime) {
    let match;
    const result = [];
    while ((match = /(\d+)[-,]?(\d*)/g.exec(rawTime)) !== null) {
        const range = [];
        const start = parseInt(match[1], 10);
        const end = match[2] === '' ? start : parseInt(match[2], 10);
        for (let i = start; i <= end; ++i) {
            range.push(i);
        }
        result.push(range);
    }
    return result;
}

function parseClass(rawInfo, index, defaultSection) {
    let weeks;
    let sections;
    const rawTime = rawInfo[index + 1];
    const ranges = parseTimeRanges(rawTime);
    switch (ranges.length) {
        case 1://似乎不应该出现，但防一手节数已知时的省略
            sections = [TIME_TABLE[defaultSection]];
            weeks = ranges[0];
            break;
        case 2://这才对嘛
            sections = ranges[0].map(section => TIME_TABLE[section]);
            weeks = ranges[1];
            break;
        default:
            throw SyntaxError(`Wrong Format: ${rawTime}, ${ranges}`);
    }
    return {
        name: rawInfo[index],
        weeks: /\|[单双]周/.test(rawTime)
            ? weeks.filter((_, i) => (i & 1) === 0)//把奇数索引的项过滤掉
            : weeks,
        teacher: rawInfo[index + 2],
        position: rawInfo[index + 3],
        day: CHAR2DAY[rawTime.charAt(1)],
        sections: sections
    };
}

function scheduleHtmlParser(html) {
    //除函数名外都可编辑
    //传入的参数为上一步函数获取到的html
    //可使用正则匹配
    //可使用解析dom匹配，工具内置了$，跟jquery使用方法一样，直接用就可以了，参考：https://juejin.im/post/5ea131f76fb9a03c8122d6b9
    //以下为示例，您可以完全重写或在此基础上更改
    const $ = cheerio.load(html, { decodeEntities: false });
    const result = [];
    $('tr').each(index => {
        index -= 1;//第一行是星期几，第二行是早晨；自减后恰好表示第几节课
        if (index < 1) return;
        $(this).children('td').each(column => {
            column -= 1;  //span特有的错位；有一列表示第几节
            switch (index) {
                case 1://早
                case 6://午
                case 10://晚
                    if (column < 1) return;
                    break;
                default:
                    if (column < 1) return;//有一列表示第几节
            }
            //span产生的错位导致column不一定表示周几
            const rawInfo = $(this).html().split('<br>').filter(n => n);
            const length = rawInfo.length;
            if (length < 2) return;//空槽只有1行
            let i = 0;
            while (++i < length) {
                if (!/^周/.test(rawInfo[i])) continue;
                result.push(parseClass(rawInfo, i - 1, index));
                i += 3;//连续的4行描述一节课
            }
        });
    });
    return result;
}