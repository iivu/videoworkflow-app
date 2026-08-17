/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'session.create': {
    methods: ["POST"],
    pattern: '/api/v1/session',
    tokens: [{"old":"/api/v1/session","type":0,"val":"api","end":""},{"old":"/api/v1/session","type":0,"val":"v1","end":""},{"old":"/api/v1/session","type":0,"val":"session","end":""}],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.validate': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/session',
    tokens: [{"old":"/api/v1/session","type":0,"val":"api","end":""},{"old":"/api/v1/session","type":0,"val":"v1","end":""},{"old":"/api/v1/session","type":0,"val":"session","end":""}],
    types: placeholder as Registry['session.validate']['types'],
  },
  'videos.check': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/videos/:id',
    tokens: [{"old":"/api/v1/videos/:id","type":0,"val":"api","end":""},{"old":"/api/v1/videos/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/:id","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['videos.check']['types'],
  },
  'videos.create': {
    methods: ["POST"],
    pattern: '/api/v1/videos',
    tokens: [{"old":"/api/v1/videos","type":0,"val":"api","end":""},{"old":"/api/v1/videos","type":0,"val":"v1","end":""},{"old":"/api/v1/videos","type":0,"val":"videos","end":""}],
    types: placeholder as Registry['videos.create']['types'],
  },
  'videos.delete': {
    methods: ["POST"],
    pattern: '/api/v1/videos/batch-delete',
    tokens: [{"old":"/api/v1/videos/batch-delete","type":0,"val":"api","end":""},{"old":"/api/v1/videos/batch-delete","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/batch-delete","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/batch-delete","type":0,"val":"batch-delete","end":""}],
    types: placeholder as Registry['videos.delete']['types'],
  },
  'videos.update': {
    methods: ["POST"],
    pattern: '/api/v1/videos/:id',
    tokens: [{"old":"/api/v1/videos/:id","type":0,"val":"api","end":""},{"old":"/api/v1/videos/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/:id","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['videos.update']['types'],
  },
  'videos.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/videos',
    tokens: [{"old":"/api/v1/videos","type":0,"val":"api","end":""},{"old":"/api/v1/videos","type":0,"val":"v1","end":""},{"old":"/api/v1/videos","type":0,"val":"videos","end":""}],
    types: placeholder as Registry['videos.list']['types'],
  },
  'voices.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/voices',
    tokens: [{"old":"/api/v1/voices","type":0,"val":"api","end":""},{"old":"/api/v1/voices","type":0,"val":"v1","end":""},{"old":"/api/v1/voices","type":0,"val":"voices","end":""}],
    types: placeholder as Registry['voices.list']['types'],
  },
  'creative_audios.create': {
    methods: ["POST"],
    pattern: '/api/v1/creative-audios',
    tokens: [{"old":"/api/v1/creative-audios","type":0,"val":"api","end":""},{"old":"/api/v1/creative-audios","type":0,"val":"v1","end":""},{"old":"/api/v1/creative-audios","type":0,"val":"creative-audios","end":""}],
    types: placeholder as Registry['creative_audios.create']['types'],
  },
  'creative_audios.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/creative-audios',
    tokens: [{"old":"/api/v1/creative-audios","type":0,"val":"api","end":""},{"old":"/api/v1/creative-audios","type":0,"val":"v1","end":""},{"old":"/api/v1/creative-audios","type":0,"val":"creative-audios","end":""}],
    types: placeholder as Registry['creative_audios.list']['types'],
  },
  'voices.clone_audio': {
    methods: ["POST"],
    pattern: '/api/v1/voices/clone/audio',
    tokens: [{"old":"/api/v1/voices/clone/audio","type":0,"val":"api","end":""},{"old":"/api/v1/voices/clone/audio","type":0,"val":"v1","end":""},{"old":"/api/v1/voices/clone/audio","type":0,"val":"voices","end":""},{"old":"/api/v1/voices/clone/audio","type":0,"val":"clone","end":""},{"old":"/api/v1/voices/clone/audio","type":0,"val":"audio","end":""}],
    types: placeholder as Registry['voices.clone_audio']['types'],
  },
  'voices.clone_video': {
    methods: ["POST"],
    pattern: '/api/v1/voices/clone/video',
    tokens: [{"old":"/api/v1/voices/clone/video","type":0,"val":"api","end":""},{"old":"/api/v1/voices/clone/video","type":0,"val":"v1","end":""},{"old":"/api/v1/voices/clone/video","type":0,"val":"voices","end":""},{"old":"/api/v1/voices/clone/video","type":0,"val":"clone","end":""},{"old":"/api/v1/voices/clone/video","type":0,"val":"video","end":""}],
    types: placeholder as Registry['voices.clone_video']['types'],
  },
  'voices.list_clone_tasks': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/voices/clone/tasks',
    tokens: [{"old":"/api/v1/voices/clone/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/voices/clone/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/voices/clone/tasks","type":0,"val":"voices","end":""},{"old":"/api/v1/voices/clone/tasks","type":0,"val":"clone","end":""},{"old":"/api/v1/voices/clone/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['voices.list_clone_tasks']['types'],
  },
  'voices.clone_task': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/voices/clone/tasks/:id',
    tokens: [{"old":"/api/v1/voices/clone/tasks/:id","type":0,"val":"api","end":""},{"old":"/api/v1/voices/clone/tasks/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/voices/clone/tasks/:id","type":0,"val":"voices","end":""},{"old":"/api/v1/voices/clone/tasks/:id","type":0,"val":"clone","end":""},{"old":"/api/v1/voices/clone/tasks/:id","type":0,"val":"tasks","end":""},{"old":"/api/v1/voices/clone/tasks/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['voices.clone_task']['types'],
  },
  'videos.create_crawler_task': {
    methods: ["POST"],
    pattern: '/api/v1/videos/crawler/tasks',
    tokens: [{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"crawler","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['videos.create_crawler_task']['types'],
  },
  'videos.list_crawler_tasks': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/videos/crawler/tasks',
    tokens: [{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"crawler","end":""},{"old":"/api/v1/videos/crawler/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['videos.list_crawler_tasks']['types'],
  },
  'video_breakdown.create': {
    methods: ["POST"],
    pattern: '/api/v1/videos/breakdown/tasks',
    tokens: [{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"breakdown","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['video_breakdown.create']['types'],
  },
  'video_breakdown.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/videos/breakdown/tasks',
    tokens: [{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"breakdown","end":""},{"old":"/api/v1/videos/breakdown/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['video_breakdown.list']['types'],
  },
  'video_breakdown.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/videos/breakdown/tasks/:taskId',
    tokens: [{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":0,"val":"api","end":""},{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":0,"val":"v1","end":""},{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":0,"val":"videos","end":""},{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":0,"val":"breakdown","end":""},{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":0,"val":"tasks","end":""},{"old":"/api/v1/videos/breakdown/tasks/:taskId","type":1,"val":"taskId","end":""}],
    types: placeholder as Registry['video_breakdown.show']['types'],
  },
  'paraformer.transcription': {
    methods: ["POST"],
    pattern: '/api/v1/paraformer/transcription/:videoId',
    tokens: [{"old":"/api/v1/paraformer/transcription/:videoId","type":0,"val":"api","end":""},{"old":"/api/v1/paraformer/transcription/:videoId","type":0,"val":"v1","end":""},{"old":"/api/v1/paraformer/transcription/:videoId","type":0,"val":"paraformer","end":""},{"old":"/api/v1/paraformer/transcription/:videoId","type":0,"val":"transcription","end":""},{"old":"/api/v1/paraformer/transcription/:videoId","type":1,"val":"videoId","end":""}],
    types: placeholder as Registry['paraformer.transcription']['types'],
  },
  'paraformer.check_task': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/paraformer/task/check/:videoId',
    tokens: [{"old":"/api/v1/paraformer/task/check/:videoId","type":0,"val":"api","end":""},{"old":"/api/v1/paraformer/task/check/:videoId","type":0,"val":"v1","end":""},{"old":"/api/v1/paraformer/task/check/:videoId","type":0,"val":"paraformer","end":""},{"old":"/api/v1/paraformer/task/check/:videoId","type":0,"val":"task","end":""},{"old":"/api/v1/paraformer/task/check/:videoId","type":0,"val":"check","end":""},{"old":"/api/v1/paraformer/task/check/:videoId","type":1,"val":"videoId","end":""}],
    types: placeholder as Registry['paraformer.check_task']['types'],
  },
  'paraformer.transcription_retry': {
    methods: ["POST"],
    pattern: '/api/v1/paraformer/transcription/retry/:videoId',
    tokens: [{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":0,"val":"api","end":""},{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":0,"val":"v1","end":""},{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":0,"val":"paraformer","end":""},{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":0,"val":"transcription","end":""},{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":0,"val":"retry","end":""},{"old":"/api/v1/paraformer/transcription/retry/:videoId","type":1,"val":"videoId","end":""}],
    types: placeholder as Registry['paraformer.transcription_retry']['types'],
  },
  'wanxiang_video_edit.create': {
    methods: ["POST"],
    pattern: '/api/v1/video-edit/tasks',
    tokens: [{"old":"/api/v1/video-edit/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['wanxiang_video_edit.create']['types'],
  },
  'wanxiang_video_edit.list': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/video-edit/tasks',
    tokens: [{"old":"/api/v1/video-edit/tasks","type":0,"val":"api","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"v1","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-edit/tasks","type":0,"val":"tasks","end":""}],
    types: placeholder as Registry['wanxiang_video_edit.list']['types'],
  },
  'wanxiang_video_edit.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/video-edit/tasks/:taskId',
    tokens: [{"old":"/api/v1/video-edit/tasks/:taskId","type":0,"val":"api","end":""},{"old":"/api/v1/video-edit/tasks/:taskId","type":0,"val":"v1","end":""},{"old":"/api/v1/video-edit/tasks/:taskId","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-edit/tasks/:taskId","type":0,"val":"tasks","end":""},{"old":"/api/v1/video-edit/tasks/:taskId","type":1,"val":"taskId","end":""}],
    types: placeholder as Registry['wanxiang_video_edit.show']['types'],
  },
  'wanxiang_video_edit.check': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/video-edit/tasks/:taskId/check',
    tokens: [{"old":"/api/v1/video-edit/tasks/:taskId/check","type":0,"val":"api","end":""},{"old":"/api/v1/video-edit/tasks/:taskId/check","type":0,"val":"v1","end":""},{"old":"/api/v1/video-edit/tasks/:taskId/check","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-edit/tasks/:taskId/check","type":0,"val":"tasks","end":""},{"old":"/api/v1/video-edit/tasks/:taskId/check","type":1,"val":"taskId","end":""},{"old":"/api/v1/video-edit/tasks/:taskId/check","type":0,"val":"check","end":""}],
    types: placeholder as Registry['wanxiang_video_edit.check']['types'],
  },
  'video_edit_conversation.send': {
    methods: ["POST"],
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/messages',
    tokens: [{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"api","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"video-breakdown","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":1,"val":"taskId","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['video_edit_conversation.send']['types'],
  },
  'video_edit_conversation.list_messages': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/messages',
    tokens: [{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"api","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"video-breakdown","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":1,"val":"taskId","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['video_edit_conversation.list_messages']['types'],
  },
  'video_edit_conversation.check': {
    methods: ["POST"],
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/check',
    tokens: [{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":0,"val":"api","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":0,"val":"v1","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":0,"val":"video-breakdown","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":1,"val":"taskId","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/check","type":0,"val":"check","end":""}],
    types: placeholder as Registry['video_edit_conversation.check']['types'],
  },
  'video_edit_conversation.abandon': {
    methods: ["POST"],
    pattern: '/api/v1/video-breakdown/:taskId/video-edit/abandon',
    tokens: [{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":0,"val":"api","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":0,"val":"v1","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":0,"val":"video-breakdown","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":1,"val":"taskId","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":0,"val":"video-edit","end":""},{"old":"/api/v1/video-breakdown/:taskId/video-edit/abandon","type":0,"val":"abandon","end":""}],
    types: placeholder as Registry['video_edit_conversation.abandon']['types'],
  },
  'oss.upload': {
    methods: ["POST"],
    pattern: '/api/v1/oss/upload',
    tokens: [{"old":"/api/v1/oss/upload","type":0,"val":"api","end":""},{"old":"/api/v1/oss/upload","type":0,"val":"v1","end":""},{"old":"/api/v1/oss/upload","type":0,"val":"oss","end":""},{"old":"/api/v1/oss/upload","type":0,"val":"upload","end":""}],
    types: placeholder as Registry['oss.upload']['types'],
  },
  'oss.upload_url': {
    methods: ["POST"],
    pattern: '/api/v1/oss/url',
    tokens: [{"old":"/api/v1/oss/url","type":0,"val":"api","end":""},{"old":"/api/v1/oss/url","type":0,"val":"v1","end":""},{"old":"/api/v1/oss/url","type":0,"val":"oss","end":""},{"old":"/api/v1/oss/url","type":0,"val":"url","end":""}],
    types: placeholder as Registry['oss.upload_url']['types'],
  },
  'oss.get_policy': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/oss/policy',
    tokens: [{"old":"/api/v1/oss/policy","type":0,"val":"api","end":""},{"old":"/api/v1/oss/policy","type":0,"val":"v1","end":""},{"old":"/api/v1/oss/policy","type":0,"val":"oss","end":""},{"old":"/api/v1/oss/policy","type":0,"val":"policy","end":""}],
    types: placeholder as Registry['oss.get_policy']['types'],
  },
  'ai.polish_article': {
    methods: ["POST"],
    pattern: '/api/v1/chat/polish-article/:videoId',
    tokens: [{"old":"/api/v1/chat/polish-article/:videoId","type":0,"val":"api","end":""},{"old":"/api/v1/chat/polish-article/:videoId","type":0,"val":"v1","end":""},{"old":"/api/v1/chat/polish-article/:videoId","type":0,"val":"chat","end":""},{"old":"/api/v1/chat/polish-article/:videoId","type":0,"val":"polish-article","end":""},{"old":"/api/v1/chat/polish-article/:videoId","type":1,"val":"videoId","end":""}],
    types: placeholder as Registry['ai.polish_article']['types'],
  },
  'ai.list_messages': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/chat/polish-article/:videoId/messages',
    tokens: [{"old":"/api/v1/chat/polish-article/:videoId/messages","type":0,"val":"api","end":""},{"old":"/api/v1/chat/polish-article/:videoId/messages","type":0,"val":"v1","end":""},{"old":"/api/v1/chat/polish-article/:videoId/messages","type":0,"val":"chat","end":""},{"old":"/api/v1/chat/polish-article/:videoId/messages","type":0,"val":"polish-article","end":""},{"old":"/api/v1/chat/polish-article/:videoId/messages","type":1,"val":"videoId","end":""},{"old":"/api/v1/chat/polish-article/:videoId/messages","type":0,"val":"messages","end":""}],
    types: placeholder as Registry['ai.list_messages']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
