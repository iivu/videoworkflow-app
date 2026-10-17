import DouyinPostJob from '#jobs/douyin-post-job';
import env from '#start/env';

if (env.get('QUEUE_DRIVER', 'redis') === 'redis') {
  await DouyinPostJob.schedule({ cleanup: true }).every('1h').run();
}

/*
|--------------------------------------------------------------------------
| Scheduler
|--------------------------------------------------------------------------
|
| This file is used to define scheduled jobs. You can schedule jobs to run
| at specific intervals using cron expressions or duration strings.
|
| Example:
|
|   import SendWeeklyReport from '#jobs/send_weekly_report'
|
|   SendWeeklyReport.schedule({ userId: 1 })
|     .cron('0 9 * * MON')
|     .run()
|
*/
