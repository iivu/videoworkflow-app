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
    'wanxiang_video_edit.create': { paramsTuple?: []; params?: {} }
    'wanxiang_video_edit.list': { paramsTuple?: []; params?: {} }
    'wanxiang_video_edit.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'wanxiang_video_edit.check': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.send': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.list_messages': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.check': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.abandon': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_workspaces.list': { paramsTuple?: []; params?: {} }
    'video_workspaces.create': { paramsTuple?: []; params?: {} }
    'video_workspaces.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.save_canvas': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.generate': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nodeId': ParamValue} }
    'video_workspaces.list_tasks': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'video_workspaces.check_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'video_workspaces.abandon_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
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
    'wanxiang_video_edit.create': { paramsTuple?: []; params?: {} }
    'video_edit_conversation.send': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.check': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.abandon': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_workspaces.create': { paramsTuple?: []; params?: {} }
    'video_workspaces.generate': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'nodeId': ParamValue} }
    'video_workspaces.abandon_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
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
    'wanxiang_video_edit.list': { paramsTuple?: []; params?: {} }
    'wanxiang_video_edit.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'wanxiang_video_edit.check': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.list_messages': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_workspaces.list': { paramsTuple?: []; params?: {} }
    'video_workspaces.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.list_tasks': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'video_workspaces.check_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
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
    'wanxiang_video_edit.list': { paramsTuple?: []; params?: {} }
    'wanxiang_video_edit.show': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'wanxiang_video_edit.check': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_edit_conversation.list_messages': { paramsTuple: [ParamValue]; params: {'taskId': ParamValue} }
    'video_workspaces.list': { paramsTuple?: []; params?: {} }
    'video_workspaces.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.list_tasks': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.show_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'video_workspaces.check_task': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'taskId': ParamValue} }
    'oss.get_policy': { paramsTuple?: []; params?: {} }
    'ai.list_messages': { paramsTuple: [ParamValue]; params: {'videoId': ParamValue} }
  }
  PUT: {
    'video_workspaces.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'video_workspaces.save_canvas': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'video_workspaces.remove': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}