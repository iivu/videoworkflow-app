/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'session.create': {
    methods: ["POST"]
    pattern: '/api/v1/session'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/session').createSessionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/session').createSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session-controller').default['create']>>>
    }
  }
  'session.validate': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/session'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session-controller').default['validate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session-controller').default['validate']>>>
    }
  }
  'videos.check': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/videos/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video').checkVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['check']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['check']>>>
    }
  }
  'videos.create': {
    methods: ["POST"]
    pattern: '/api/v1/videos'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video').createVideoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/video').createVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['create']>>>
    }
  }
  'videos.delete': {
    methods: ["POST"]
    pattern: '/api/v1/videos/batch-delete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video').deleteVideoValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/video').deleteVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['delete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['delete']>>>
    }
  }
  'videos.update': {
    methods: ["POST"]
    pattern: '/api/v1/videos/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video').updateVideoValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video').updateVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['update']>>>
    }
  }
  'videos.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/videos'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video').listVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['list']>>>
    }
  }
  'voices.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/voices'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/voice').listVoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['list']>>>
    }
  }
  'creative_audios.create': {
    methods: ["POST"]
    pattern: '/api/v1/creative-audios'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/creative-audio').synthesizeCreativeAudioValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/creative-audio').synthesizeCreativeAudioValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/creative-audios-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/creative-audios-controller').default['create']>>>
    }
  }
  'creative_audios.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/creative-audios'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/creative-audio').listCreativeAudioValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/creative-audios-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/creative-audios-controller').default['list']>>>
    }
  }
  'voices.clone_audio': {
    methods: ["POST"]
    pattern: '/api/v1/voices/clone/audio'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/voice').cloneAudioVoiceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/voice').cloneAudioVoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneAudio']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneAudio']>>>
    }
  }
  'voices.clone_video': {
    methods: ["POST"]
    pattern: '/api/v1/voices/clone/video'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/voice').cloneVideoVoiceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/voice').cloneVideoVoiceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneVideo']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneVideo']>>>
    }
  }
  'voices.list_clone_tasks': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/voices/clone/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/voice').listCloneVoiceTasksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['listCloneTasks']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['listCloneTasks']>>>
    }
  }
  'voices.clone_task': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/voices/clone/tasks/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/voice').cloneVoiceTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/voices-controller').default['cloneTask']>>>
    }
  }
  'videos.create_crawler_task': {
    methods: ["POST"]
    pattern: '/api/v1/videos/crawler/tasks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/crawler-video-task').createCrawlerVideoTaskValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/crawler-video-task').createCrawlerVideoTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['createCrawlerTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['createCrawlerTask']>>>
    }
  }
  'videos.list_crawler_tasks': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/videos/crawler/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/crawler-video-task').listCrawlerVideoTasksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['listCrawlerTasks']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/videos-controller').default['listCrawlerTasks']>>>
    }
  }
  'paraformer.transcription': {
    methods: ["POST"]
    pattern: '/api/v1/paraformer/transcription/:videoId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/paraformer').paraformerVideoValidator)>>
      paramsTuple: [ParamValue]
      params: { videoId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/paraformer').paraformerVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['transcription']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['transcription']>>>
    }
  }
  'paraformer.check_task': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/paraformer/task/check/:videoId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { videoId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/paraformer').paraformerVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['checkTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['checkTask']>>>
    }
  }
  'paraformer.transcription_retry': {
    methods: ["POST"]
    pattern: '/api/v1/paraformer/transcription/retry/:videoId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/paraformer').paraformerVideoValidator)>>
      paramsTuple: [ParamValue]
      params: { videoId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/paraformer').paraformerVideoValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['transcriptionRetry']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/paraformer-controller').default['transcriptionRetry']>>>
    }
  }
  'oss.upload': {
    methods: ["POST"]
    pattern: '/api/v1/oss/upload'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['upload']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['upload']>>>
    }
  }
  'oss.upload_url': {
    methods: ["POST"]
    pattern: '/api/v1/oss/url'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/oss').uploadURLValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/oss').uploadURLValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['uploadURL']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['uploadURL']>>>
    }
  }
  'oss.get_policy': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/oss/policy'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['getPolicy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/oss-controller').default['getPolicy']>>>
    }
  }
  'ai.polish_article': {
    methods: ["POST"]
    pattern: '/api/v1/chat/polish-article'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['polishArticle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['polishArticle']>>>
    }
  }
  'xhs_sessions.create': {
    methods: ["POST"]
    pattern: '/api/v1/xhs/sessions'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/xhs').createXhsSessionValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/xhs').createXhsSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['create']>>>
    }
  }
  'xhs_sessions.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/xhs/sessions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/xhs').listXhsSessionsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['list']>>>
    }
  }
  'xhs_sessions.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/xhs/sessions/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/xhs').checkXhsSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['show']>>>
    }
  }
  'xhs_sessions.update': {
    methods: ["POST"]
    pattern: '/api/v1/xhs/sessions/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/xhs').updateXhsSessionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/xhs').updateXhsSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['update']>>>
    }
  }
  'xhs_sessions.delete': {
    methods: ["POST"]
    pattern: '/api/v1/xhs/sessions/:id/delete'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/xhs').checkXhsSessionValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/xhs').checkXhsSessionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['delete']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['delete']>>>
    }
  }
  'xhs_sessions.list_messages': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/xhs/sessions/:id/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/xhs').listXhsMessagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['listMessages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['listMessages']>>>
    }
  }
  'xhs_sessions.chat_copy': {
    methods: ["POST"]
    pattern: '/api/v1/xhs/sessions/:id/chat/copy'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/xhs').chatCopyValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/xhs').chatCopyValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['chatCopy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['chatCopy']>>>
    }
  }
  'xhs_sessions.chat_image': {
    methods: ["POST"]
    pattern: '/api/v1/xhs/sessions/:id/chat/image'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/xhs').chatImageValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/xhs').chatImageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['chatImage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/xhs-sessions-controller').default['chatImage']>>>
    }
  }
}
