# 视频分镜检测方案

## 目标

`video-breakdown` 使用 FFmpeg `scdet` 滤镜获取采样帧的场景变化分数，再由 Node.js 通过滑动窗口分析分数序列。该方案替代原来的 `select=gt(scene,固定阈值)`，同时支持检测突发硬切和持续多帧的渐变转场。

实现位于 `apps/api/app/services/ffmpeg-service.ts`，由 `VideoBreakdownJob` 调用 `FfmpegService.breakdown()`，不引入 `sharp`、`canvas` 或其他图像依赖。

## 项目调用链

1. `VideoBreakdownJob` 下载源视频到 `app.tmpPath('video-breakdown/{taskId}/source-video')`。
2. `FfmpegService.breakdown()` 使用 `ffprobe` 获取视频总时长。
3. FFmpeg 以 4 fps 采样，`scdet` 为每帧写入 `lavfi.scd.score` 元数据。
4. `metadata=mode=print:file=-` 将文本元数据写到 stdout，避免创建额外临时文件。
5. 服务解析分数序列，分别检测硬切和渐变，再合并相距过近的切换点。
6. 切换点被转换为连续且覆盖完整视频的时间段。
7. 任务使用现有 `cutSegment()` 逐段转码，并将结果写入 `public/video-breakdown/{taskId}`。

## FFmpeg 命令

项目通过 `execFile` 传递参数，不拼接 shell 命令：

```bash
ffmpeg \
  -hide_banner \
  -loglevel error \
  -i <videoPath> \
  -vf 'fps=4,scdet=t=1,metadata=mode=print:file=-' \
  -an \
  -f null \
  -
```

输出格式示例：

```text
frame:0    pts:0       pts_time:0
lavfi.scd.mafd=0.000
lavfi.scd.score=0.000
frame:1    pts:1       pts_time:0.25
lavfi.scd.mafd=15.370
lavfi.scd.score=15.370
lavfi.scd.time=0.25
```

## 检测参数

| 参数 | 当前值 | 说明 |
| --- | ---: | --- |
| 分析帧率 | 4 fps | 控制检测精度和耗时 |
| 滑动窗口半径 | 8 帧 | 计算局部均值和标准差 |
| 硬切阈值 | 局部均值 + 3σ，且分数 > 5 | 只保留局部异常峰 |
| 渐变阈值 | 分数 >= 12 | 识别连续宽峰 |
| 渐变最少帧数 | 4 帧 | 排除短暂波动 |
| 最短分镜时长 | 0.3 秒 | 合并相邻切换并避免尾部碎片 |

硬切候选必须是局部最大值。渐变候选取连续高分区间中的最高分帧。两类候选按帧序合并；间隔不足最短分镜时长时，仅保留分数更高的候选。

## 边界规则

- 元数据少于两帧时，任务失败并报告“有效帧数不足”。
- 非法或越界切换点会被忽略。
- 首段从 `00:00:00.000` 开始，末段结束于 `ffprobe` 返回的总时长。
- 不生成短于 0.3 秒的中间段或尾段；靠近结尾的切换点会并入末段，视频内容不会丢失。
- 输出格式仍为 `{ start, end }`，因此 `VideoBreakdownJob` 和前端接口无需调整。

## 验证

检查 FFmpeg 是否支持 `scdet`：

```bash
ffmpeg -hide_banner -filters | grep scdet
```

运行聚焦单元测试：

```bash
pnpm --filter api exec node ace test unit --files=ffmpeg-service.spec.ts
```

运行 API 类型检查和代码规范检查：

```bash
pnpm --filter api typecheck
pnpm --filter api check
```

本次改动不需要迁移，也不得执行数据库相关命令。按项目约定，任何后端改动完成后都要运行 `pnpm --filter api dev`，让 AdonisJS 重新生成 `.adonisjs` 客户端文件；本方案未改变 API 合同。

## 与旧方案对比

| 维度 | 固定阈值 `select` | `scdet` + 自适应分析 |
| --- | --- | --- |
| 数据来源 | FFmpeg 内部单点判断 | 完整帧级分数序列 |
| 阈值逻辑 | 全局固定值 | 局部均值与标准差 |
| 硬切 | 支持 | 支持，并按局部显著性过滤 |
| 渐变 | 容易漏检 | 检测连续高分宽峰 |
| 快速运动或光照变化 | 容易误切 | 通过局部统计降低误切概率 |
