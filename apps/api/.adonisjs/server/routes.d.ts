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
    'creative_audios.create': { paramsTuple?: []; params?: {} }
    'creative_audios.list': { paramsTuple?: []; params?: {} }
    'voices.clone_audio': { paramsTuple?: []; params?: {} }
    'voices.clone_video': { paramsTuple?: []; params?: {} }
    'voices.list_clone_tasks': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.create_crawler_task': { paramsTuple?: []; params?: {} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'video_breakdown.create': { paramsTuple?: []; params?: {} }
    'video_breakdown.list': { paramsTuple?: []; params?: {} }
    'video_breakdown.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'paraformer.transcription': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.transcription_retry': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.upload': { paramsTuple?: []; params?: {} }
    'oss.upload_url': { paramsTuple?: []; params?: {} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'ai.polish_article': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'ai.list_messages': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
  }
  POST: {
    'session.create': { paramsTuple?: []; params?: {} }
    'videos.create': { paramsTuple?: []; params?: {} }
    'videos.delete': { paramsTuple?: []; params?: {} }
    'videos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'creative_audios.create': { paramsTuple?: []; params?: {} }
    'voices.clone_audio': { paramsTuple?: []; params?: {} }
    'voices.clone_video': { paramsTuple?: []; params?: {} }
    'videos.create_crawler_task': { paramsTuple?: []; params?: {} }
    'video_breakdown.create': { paramsTuple?: []; params?: {} }
    'paraformer.transcription': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'paraformer.transcription_retry': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.upload': { paramsTuple?: []; params?: {} }
    'oss.upload_url': { paramsTuple?: []; params?: {} }
    'ai.polish_article': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
  }
  GET: {
    'session.validate': { paramsTuple?: []; params?: {} }
    'videos.check': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list': { paramsTuple?: []; params?: {} }
    'voices.list': { paramsTuple?: []; params?: {} }
    'creative_audios.list': { paramsTuple?: []; params?: {} }
    'voices.list_clone_tasks': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'video_breakdown.list': { paramsTuple?: []; params?: {} }
    'video_breakdown.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'ai.list_messages': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
  }
  HEAD: {
    'session.validate': { paramsTuple?: []; params?: {} }
    'videos.check': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list': { paramsTuple?: []; params?: {} }
    'voices.list': { paramsTuple?: []; params?: {} }
    'creative_audios.list': { paramsTuple?: []; params?: {} }
    'voices.list_clone_tasks': { paramsTuple?: []; params?: {} }
    'voices.clone_task': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'videos.list_crawler_tasks': { paramsTuple?: []; params?: {} }
    'video_breakdown.list': { paramsTuple?: []; params?: {} }
    'video_breakdown.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'paraformer.check_task': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'ai.list_messages': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}