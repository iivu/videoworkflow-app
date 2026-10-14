# 02 · 登录与权限

## 行为

- 用户名和密码通过 `POST /api/v1/session` 验证，返回 JWT Bearer token 和含角色的用户资料；`GET /api/v1/session` 校验登录并返回用户资料。
- 除登录接口外，当前业务 API 均要求认证；没有注册或服务端退出接口。
- 前端保存 token，并在 API 请求中附带 `Authorization`；已有 token 时先校验，未登录时显示登录页。
- 退出登录由前端确认后清除本地 token 和用户状态，不撤销已签发的 JWT。
- 当前视频批量删除要求角色代码为 `admin_owner`，由 `VideoPolicy` 校验；不能据此推断其他操作也有相同角色限制。
- 数据可见范围由各功能定义，登录不等于所有资源都按用户隔离。

## 入口

- 后端：`apps/api/app/controllers/session-controller.ts`、`apps/api/app/guards/jwt-guard.ts`、`apps/api/app/policies/video-policy.ts`。
- 前端：`apps/web/src/providers/auth-provider.tsx`、`apps/web/src/routes/_auth/route.tsx`。
