export class PromptService {
  /**
   * 视频文案润色/仿写的系统提示词。
   *
   * TODO: 占位提示词，后续补充具体的润色与仿写指令。
   */
  polishArticleSystemPrompt(transcript: string) {
    return ['你是一名专业的视频文案润色与仿写助手。', '', '请基于以下视频文案，结合用户的要求进行润色或仿写。', '', '视频文案如下：', '"""', transcript, '"""'].join('\n');
  }

  /**
   * 视频拆解任务的系统提示词。
   *
   * 要求模型将视频拆解为连续的时间片段，并以 JSON 数组形式返回
   */
  videoBreakdownSystemPrompt() {
    return [
      '你是一名视频内容拆解助手。请观看视频，按分镜将其拆解为若干个连续的时间片段，并只返回一个 JSON 数组。',
      '片段边界应尽量落在抽帧点上。',
      '每个片段对象包含以下字段：',
      '- start: 片段开始时间，格式为：HH:MM:SS.sss，必须精确到毫秒（三位小数）',
      '- end: 片段结束时间，格式为：HH:MM:SS.sss，必须精确到毫秒（三位小数）且必须大于 start',
      '- summary: 该片段的中文梗概（字符串）',
      '要求：',
      '- 片段按开始时间升序排列',
      '- 片段之间不可重叠',
      '- 只返回 JSON 数组，不要输出任何解释、注释或 Markdown 代码块',
    ].join('\n');
  }
}
