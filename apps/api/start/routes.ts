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
    r.post('/voices/clone/audio', [controllers.Voices, 'cloneAudio']);
    r.post('/voices/clone/video', [controllers.Voices, 'cloneVideo']);
    r.get('/voices/clone/tasks/:id', [controllers.Voices, 'cloneTask']);

    r.post('/videos/crawler/tasks', [controllers.Videos, 'createCrawlerTask']);
    r.get('/videos/crawler/tasks', [controllers.Videos, 'listCrawlerTasks']);

    r.post('/paraformer/transcription/:videoId', [controllers.Paraformer, 'transcription']);
    r.get('/paraformer/task/check/:videoId', [controllers.Paraformer, 'checkTask']);
    r.post('/paraformer/transcription/retry/:videoId', [controllers.Paraformer, 'transcriptionRetry']);

    r.post('/oss/upload', [controllers.Oss, 'upload']);
    r.post('/oss/url', [controllers.Oss, 'uploadURL']);
    r.get('/oss/policy', [controllers.Oss, 'getPolicy']);

    r.post('/xhs/sessions', [controllers.XhsSessions, 'create']);
    r.get('/xhs/sessions', [controllers.XhsSessions, 'list']);
    r.get('/xhs/sessions/:id', [controllers.XhsSessions, 'show']);
    r.post('/xhs/sessions/:id', [controllers.XhsSessions, 'update']);
    r.post('/xhs/sessions/:id/delete', [controllers.XhsSessions, 'delete']);
    r.get('/xhs/sessions/:id/messages', [controllers.XhsSessions, 'listMessages']);
    r.post('/xhs/sessions/:id/chat/copy', [controllers.XhsSessions, 'chatCopy']);
    r.post('/xhs/sessions/:id/chat/image', [controllers.XhsSessions, 'chatImage']);
  }).use(middleware.auth());
}).prefix('/api/v1');
