/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  session: {
    create: typeof routes['session.create']
    validate: typeof routes['session.validate']
  }
  videos: {
    check: typeof routes['videos.check']
    create: typeof routes['videos.create']
    delete: typeof routes['videos.delete']
    update: typeof routes['videos.update']
    list: typeof routes['videos.list']
    createCrawlerTask: typeof routes['videos.create_crawler_task']
    listCrawlerTasks: typeof routes['videos.list_crawler_tasks']
  }
  voices: {
    list: typeof routes['voices.list']
    cloneAudio: typeof routes['voices.clone_audio']
    cloneVideo: typeof routes['voices.clone_video']
    listCloneTasks: typeof routes['voices.list_clone_tasks']
    cloneTask: typeof routes['voices.clone_task']
  }
  creativeAudios: {
    create: typeof routes['creative_audios.create']
    list: typeof routes['creative_audios.list']
  }
  paraformer: {
    transcription: typeof routes['paraformer.transcription']
    checkTask: typeof routes['paraformer.check_task']
    transcriptionRetry: typeof routes['paraformer.transcription_retry']
  }
  oss: {
    upload: typeof routes['oss.upload']
    uploadUrl: typeof routes['oss.upload_url']
    getPolicy: typeof routes['oss.get_policy']
  }
  ai: {
    polishArticle: typeof routes['ai.polish_article']
    listMessages: typeof routes['ai.list_messages']
  }
  xhsSessions: {
    create: typeof routes['xhs_sessions.create']
    list: typeof routes['xhs_sessions.list']
    show: typeof routes['xhs_sessions.show']
    update: typeof routes['xhs_sessions.update']
    delete: typeof routes['xhs_sessions.delete']
    listMessages: typeof routes['xhs_sessions.list_messages']
    chatCopy: typeof routes['xhs_sessions.chat_copy']
    chatImage: typeof routes['xhs_sessions.chat_image']
  }
}
