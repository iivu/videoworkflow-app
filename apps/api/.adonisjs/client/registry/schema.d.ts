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
  'video_breakdown.create': {
    methods: ["POST"]
    pattern: '/api/v1/videos/breakdown/tasks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-breakdown').createVideoBreakdownTaskValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/video-breakdown').createVideoBreakdownTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['create']>>>
    }
  }
  'video_breakdown.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/videos/breakdown/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video-breakdown').listVideoBreakdownTasksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['list']>>>
    }
  }
  'video_breakdown.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/videos/breakdown/tasks/:taskId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video-breakdown').showVideoBreakdownTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-breakdown-controller').default['show']>>>
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
  'wanxiang_video_edit.create': {
    methods: ["POST"]
    pattern: '/api/v1/video-edit/tasks'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/wanxiang-video-edit').createWanxiangVideoEditTaskValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/wanxiang-video-edit').createWanxiangVideoEditTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['create']>>>
    }
  }
  'wanxiang_video_edit.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-edit/tasks'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/wanxiang-video-edit').listWanxiangVideoEditTasksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['list']>>>
    }
  }
  'wanxiang_video_edit.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-edit/tasks/:taskId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/wanxiang-video-edit').showWanxiangVideoEditTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['show']>>>
    }
  }
  'wanxiang_video_edit.check': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-edit/tasks/:taskId/check'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/wanxiang-video-edit').showWanxiangVideoEditTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['check']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/wanxiang-video-edit-controller').default['check']>>>
    }
  }
  'video_edit_conversation.send': {
    methods: ["POST"]
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/messages'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-edit-message').sendVideoEditMessageValidator)>>
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-edit-message').sendVideoEditMessageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['send']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['send']>>>
    }
  }
  'video_edit_conversation.list_messages': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video-edit-message').listVideoEditMessagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['listMessages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['listMessages']>>>
    }
  }
  'video_edit_conversation.check': {
    methods: ["POST"]
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/check'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-edit-message').conversationTaskActionValidator)>>
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-edit-message').conversationTaskActionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['check']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['check']>>>
    }
  }
  'video_edit_conversation.abandon': {
    methods: ["POST"]
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/abandon'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-edit-message').conversationTaskActionValidator)>>
      paramsTuple: [ParamValue]
      params: { taskId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-edit-message').conversationTaskActionValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['abandon']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-edit-conversation-controller').default['abandon']>>>
    }
  }
  'video_workspaces.list': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-workspaces'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['list']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['list']>>>
    }
  }
  'video_workspaces.create': {
    methods: ["POST"]
    pattern: '/api/v1/video-workspaces'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-workspace').createVideoWorkspaceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/video-workspace').createVideoWorkspaceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['create']>>>
    }
  }
  'video_workspaces.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-workspaces/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/video-workspace').showVideoWorkspaceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['show']>>>
    }
  }
  'video_workspaces.rename': {
    methods: ["PUT"]
    pattern: '/api/v1/video-workspaces/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-workspace').renameVideoWorkspaceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-workspace').renameVideoWorkspaceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['rename']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['rename']>>>
    }
  }
  'video_workspaces.save_canvas': {
    methods: ["PUT"]
    pattern: '/api/v1/video-workspaces/:id/canvas'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-workspace').saveVideoWorkspaceCanvasValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-workspace').saveVideoWorkspaceCanvasValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['saveCanvas']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['saveCanvas']>>>
    }
  }
  'video_workspaces.remove': {
    methods: ["DELETE"]
    pattern: '/api/v1/video-workspaces/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/video-workspace').removeVideoWorkspaceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/video-workspace').removeVideoWorkspaceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['remove']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['remove']>>>
    }
  }
  'video_workspaces.generate': {
    methods: ["POST"]
    pattern: '/api/v1/video-workspaces/:id/nodes/:nodeId/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/canvas-generation').generateVideoWorkspaceNodeValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; nodeId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/canvas-generation').generateVideoWorkspaceNodeValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['generate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['generate']>>>
    }
  }
  'video_workspaces.list_tasks': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-workspaces/:id/tasks'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/canvas-generation').listVideoWorkspaceTasksValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['listTasks']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['listTasks']>>>
    }
  }
  'video_workspaces.show_task': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-workspaces/:id/tasks/:taskId'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/canvas-generation').showVideoWorkspaceTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['showTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['showTask']>>>
    }
  }
  'video_workspaces.check_task': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/video-workspaces/:id/tasks/:taskId/check'
    types: {
      body: {}
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; taskId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/canvas-generation').showVideoWorkspaceTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['checkTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['checkTask']>>>
    }
  }
  'video_workspaces.abandon_task': {
    methods: ["POST"]
    pattern: '/api/v1/video-workspaces/:id/tasks/:taskId/abandon'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/canvas-generation').showVideoWorkspaceTaskValidator)>>
      paramsTuple: [ParamValue, ParamValue]
      params: { id: ParamValue; taskId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/canvas-generation').showVideoWorkspaceTaskValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['abandonTask']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/video-workspaces-controller').default['abandonTask']>>>
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
    pattern: '/api/v1/chat/polish-article/:videoId'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/ai').polishArticleValidator)>>
      paramsTuple: [ParamValue]
      params: { videoId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/ai').polishArticleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['polishArticle']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['polishArticle']>>>
    }
  }
  'ai.list_messages': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/chat/polish-article/:videoId/messages'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { videoId: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/ai').listPolishArticleMessagesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['listMessages']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai-controller').default['listMessages']>>>
    }
  }
}
