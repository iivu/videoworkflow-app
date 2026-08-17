export default {
  name: 'minimaxi_voices -> voices',
  source: { database: 'video_workflow', table: 'minimaxi_voices' },
  target: { database: 'videoworkflow_app_v2', table: 'voices' },
  fields: [
    ['user_id', 'user_id', '01a00f17-3eee-733f-b834-03a14311b05b'],
    ['name', 'name'],
    ['provider', 'provider', 'minimaxi'],
    ['model','model', 'speech-2.8-hd'],
    ['voice_id', 'voice_id'],
    ['voice_demo_url', 'demo_url'],
    ['config', 'config', '{}'],
    ['created_at', 'created_at', new Date().toISOString().replace('T', ' ').replace('Z', '')],
    ['updated_at', 'updated_at', new Date().toISOString().replace('T', ' ').replace('Z', '')],
  ],
};