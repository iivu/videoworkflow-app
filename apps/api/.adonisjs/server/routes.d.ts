import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'session.create': { paramsTuple?: []; params?: {} }
    'session.validate': { paramsTuple?: []; params?: {} }
    'videos.check': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.create': { paramsTuple?: []; params?: {} }
    'videos.delete': { paramsTuple?: []; params?: {} }
    'videos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list': { paramsTuple?: []; params?: {} }
    'voices.list': { paramsTuple?: []; params?: {} }
    'voices.clone_audio': { paramsTuple?: []; params?: {} }
    'voices.clone_video': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.create_crawler_task': { paramsTuple?: []; params?: {} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'paraformer.transcription': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.transcription_retry': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.upload': { paramsTuple?: []; params?: {} }
    'oss.upload_url': { paramsTuple?: []; params?: {} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'xhs_sessions.create': { paramsTuple?: []; params?: {} }
    'xhs_sessions.list': { paramsTuple?: []; params?: {} }
    'xhs_sessions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.list_messages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.chat_copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.chat_image': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'session.create': { paramsTuple?: []; params?: {} }
    'videos.create': { paramsTuple?: []; params?: {} }
    'videos.delete': { paramsTuple?: []; params?: {} }
    'videos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'voices.clone_audio': { paramsTuple?: []; params?: {} }
    'voices.clone_video': { paramsTuple?: []; params?: {} }
    'videos.create_crawler_task': { paramsTuple?: []; params?: {} }
    'paraformer.transcription': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.transcription_retry': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.upload': { paramsTuple?: []; params?: {} }
    'oss.upload_url': { paramsTuple?: []; params?: {} }
    'xhs_sessions.create': { paramsTuple?: []; params?: {} }
    'xhs_sessions.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.chat_copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.chat_image': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'session.validate': { paramsTuple?: []; params?: {} }
    'videos.check': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list': { paramsTuple?: []; params?: {} }
    'voices.list': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'xhs_sessions.list': { paramsTuple?: []; params?: {} }
    'xhs_sessions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.list_messages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'session.validate': { paramsTuple?: []; params?: {} }
    'videos.check': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list': { paramsTuple?: []; params?: {} }
    'voices.list': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'xhs_sessions.list': { paramsTuple?: []; params?: {} }
    'xhs_sessions.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'xhs_sessions.list_messages': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}