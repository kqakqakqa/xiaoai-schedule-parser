async function scheduleHtmlProvider() {
    await loadTool('AIScheduleTools');
    const iframe = document.querySelector('#iframeautoheight');
    if (!iframe) {
        await AIScheduleTools().AISchedulePrompt({
            titleText: '位置异常',
            tipText: '请确认当前位于 查询→学生个人课表 再尝试；\n目前仅支持新学期课表。\n如遇到问题请复制并访问下方链接进行反馈',
            defaultText: 'https://github.com/2190303755/BUUSchedule/issues',
            validator: () => false
        });
        return 'do not continue';
    }
    const schedule = iframe.contentDocument.querySelector('.schedule')?.outerHTML;
    if (!schedule) {
        await AIScheduleTools().AISchedulePrompt({
            titleText: '没有找到课表',
            tipText: '请确认当前位于 查询→学生个人课表 再尝试；\n目前仅支持新学期课表。\n如遇到问题请复制并访问下方链接进行反馈',
            defaultText: 'https://github.com/2190303755/BUUSchedule/issues',
            validator: () => false
        });
        return 'do not continue';
    }
    await AIScheduleTools().AISchedulePrompt({
        titleText: '即将开始解析',
        tipText: '如遇到问题请复制并访问下方链接进行反馈',
        defaultText: 'https://github.com/2190303755/BUUSchedule/issues',
        validator: () => false
    });
    return schedule;
}