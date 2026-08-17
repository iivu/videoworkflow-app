/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import r from '@adonisjs/core/services/router';
import { controllers } from '#generated/controllers';
import { middleware } from '#start/kernel';

r.group(() => {
  r.post('/session', [controllers.Session, 'create']);
  r.group(() => {
    r.get('/session', [controllers.Session, 'validate']);

    r.get('/videos/:id', [controllers.Videos, 'check']);
    r.post('/videos', [controllers.Videos, 'create']);
    r.post('/videos/batch-delete', [controllers.Videos, 'delete']);
    r.post('/videos/:id', [controllers.Videos, 'update']);
    r.get('/videos', [controllers.Videos, 'list']);
    r.get('/voices', [controllers.Voices, 'list']);
    r.post('/creative-audios', [controllers.CreativeAudios, 'create']);
    r.get('/creative-audios', [controllers.CreativeAudios, 'list']);
    r.post('/voices/clone/audio', [controllers.Voices, 'cloneAudio']);
    r.post('/voices/clone/video', [controllers.Voices, 'cloneVideo']);
    r.get('/voices/clone/tasks', [controllers.Voices, 'listCloneTasks']);
    r.get('/voices/clone/tasks/:id', [controllers.Voices, 'cloneTask']);

    r.post('/videos/crawler/tasks', [controllers.Videos, 'createCrawlerTask']);
    r.get('/videos/crawler/tasks', [controllers.Videos, 'listCrawlerTasks']);

    r.post('/videos/breakdown/tasks', [controllers.VideoBreakdown, 'create']);
    r.get('/videos/breakdown/tasks', [controllers.VideoBreakdown, 'list']);
    r.get('/videos/breakdown/tasks/:taskId', [controllers.VideoBreakdown, 'show']);

    r.post('/paraformer/transcription/:videoId', [controllers.Paraformer, 'transcription']);
    r.get('/paraformer/task/check/:videoId', [controllers.Paraformer, 'checkTask']);
    r.post('/paraformer/transcription/retry/:videoId', [controllers.Paraformer, 'transcriptionRetry']);

    r.post('/video-edit/tasks', [controllers.WanxiangVideoEdit, 'create']);
    r.get('/video-edit/tasks', [controllers.WanxiangVideoEdit, 'list']);
    r.get('/video-edit/tasks/:taskId', [controllers.WanxiangVideoEdit, 'show']);
    r.get('/video-edit/tasks/:taskId/check', [controllers.WanxiangVideoEdit, 'check']);

    r.post('/video-breakdown/:taskId/video-edit/messages', [controllers.VideoEditConversation, 'send']);
    r.get('/video-breakdown/:taskId/video-edit/messages', [controllers.VideoEditConversation, 'listMessages']);
    r.post('/video-breakdown/:taskId/video-edit/check', [controllers.VideoEditConversation, 'check']);
    r.post('/video-breakdown/:taskId/video-edit/abandon', [controllers.VideoEditConversation, 'abandon']);

    r.post('/oss/upload', [controllers.Oss, 'upload']);
    r.post('/oss/url', [controllers.Oss, 'uploadURL']);
    r.get('/oss/policy', [controllers.Oss, 'getPolicy']);

    r.post('/chat/polish-article/:videoId', [controllers.Ai, 'polishArticle']);
    r.get('/chat/polish-article/:videoId/messages', [controllers.Ai, 'listMessages']);
  }).use(middleware.auth());
}).prefix('/api/v1');
