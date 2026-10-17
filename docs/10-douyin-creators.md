# 10 · 抖音博主库

## 用途与入口

登录后通过“内容 → 抖音博主”（`/douyin-creators`）维护当前用户的博主资料。页面参考卡片布局，提供昵称/抖音号搜索、获赞/粉丝/作品数排序与分页，默认每页 12 条、按获赞降序；排序选择与“抖音账号新增”并排放在顶部工具栏。

本期仅管理博主资料，不抓取或保存作品，不实现详情、下载、分类或标签。卡片“已下载”默认为 0，“查看详情”保留外观但不执行操作；不展示顶部汇总统计。

## 添加与刷新

- 新增支持 HTTPS 抖音博主主页 URL、`v.douyin.com` 分享短链接或 `sec_uid`，后端规范化并校验；不接受视频链接或批量输入。
- 预创建博主的 `sec_uid` 始终为空，通过内部 `id` 关联抓取任务。后端通过 `guaikai-api-service` 调用 `limit=0` 获取博主资料与互动数据，worker 负责创建、查询外部任务。
- 任务状态为 `processing/completed/failed/canceled`。临时供应商错误码（1–9）延迟查询，其他错误由队列有限重试后保存失败原因。
- 成功后以 `(user_id, sec_uid)` 合并资料；分享短链解析前无法确认身份，可能暂时出现多张占位卡，完成后合并为一个博主。相同规范化输入或已知身份重复添加会刷新已有记录，已处理中则复用任务。
- 同一用户的创建、重试、合并和删除使用用户行锁串行化；合并不允许较旧任务覆盖较新任务的资料。本地下载数与创建时间不由外部快照覆盖。
- 头像尽力转存至现有 OSS 的稳定对象路径，成功时更新地址；失败不影响任务成功，也不展示头像错误。没有可用头像时展示圆形色块和昵称首字符。刷新时保留已有可用 OSS 地址。

## 交互与边界

- 占位卡展示采集中状态及输入内容；成功展示昵称、抖音号、签名、UID、IP 属地、获赞、关注、粉丝、作品数和最近同步时间（`YYYY-MM-DD HH:mm`）。缺省数字为 0，文本为 `—`；IP 属地去除供应商返回的 `IP属地：` 前缀，缺省为 `-`。数字在前端使用万/亿格式。
- 页面有进行中任务时每 2 秒查询本地列表和任务状态，无固定持续时间，离开页面停止；重新进入继续查询。查询范围包含当前用户全部进行中任务，不因搜索或分页遗漏任务。
- 卡片支持手动重试与删除；处理中禁用重试。重试重新获取资料并尝试头像转存。删除需确认，立即删除卡片并将进行中任务标为取消；已提交外部任务的结果不再回写或恢复卡片。
- 新增弹窗底部以红色小字简要提示采集将产生费用，不再叠加确认弹窗。卡片重新采集复用现有 `confirm-dialog`，简要提示费用并在确认后提交任务；取消不发起调用。用户提示不暴露供应商或后端细节。搜索、排序、分页和列表刷新只查询本地数据，不加扣费确认。
- 所有列表、任务查询及写操作按登录用户隔离。新功能不改变其他业务的权限规则。
- API 与 worker 为不同进程；`pnpm --filter api start:queue-worker` 包含 `douyin-creator-queue`。需要先由维护者运行迁移并生成模型 schema，Agent 不执行任何数据库操作，见 [09](09-development.md)。

## 实现入口

- 后端：`douyin-creators-controller.ts`、`douyin-creator-service.ts`、`douyin-creator-job.ts`，路由集中于 `apps/api/start/routes.ts`。
- 数据：`DouyinCreator`、`DouyinCreatorTask` 及对应迁移；model 继承迁移生成的 schema。
- 前端：`apps/web/src/features/douyin-creator/`、`apps/web/src/routes/_auth/douyin-creators/index.tsx`。
- 接口：`GET/POST /douyin-creators`、`POST /douyin-creators/:id/retry`、`DELETE /douyin-creators/:id`、`GET /douyin-creator-tasks/:taskId`（均在 `/api/v1` 下）。
