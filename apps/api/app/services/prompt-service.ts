export class PromptService {
  /**
   * 视频文案润色/仿写的系统提示词。
   *
   * TODO: 占位提示词，后续补充具体的润色与仿写指令。
   */
  polishArticleSystemPrompt(transcript: string) {
    return ['你是一名专业的视频文案润色与仿写助手。', '', '请基于以下视频文案，结合用户的要求进行润色或仿写。', '', '视频文案如下：', '"""', transcript, '"""'].join('\n');
  }
}
