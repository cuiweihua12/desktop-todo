# 桌灵 DeskLing

> 可插拔模块的**桌面助手**（PC 端可安装程序）。当前已内置 **「任务进度 / 待办」** 模块，支持系统托盘右键菜单、定时提醒、进度可视化。架构预留多模块扩展能力，后续模块可热插拔。

- 技术栈：**Electron + 原生 Node 主进程 + 渲染层 UI**（非浏览器打开的 HTML，而是真正的桌面安装程序）
- 平台：Windows（NSIS 安装包）、macOS（dmg）、Linux（AppImage / deb）
- 仓库：`https://gitee.com/blithesome/desktop-todo.git`（每次提交自动推送）

---

## 1. 功能特性

| 模块 | 功能 |
|------|------|
| **系统托盘** | 常驻托盘，右键弹出菜单（显示主面板 / 新建任务 / 开机自启 / 退出）；左键点击唤起主面板 |
| **任务待办** | 增删改、状态流转（待办→进行中→已完成）、优先级、分类、截止时间、进度条 |
| **进度可视化** | 总进度百分比 + 完成数统计 + 每任务迷你进度条 |
| **定时提醒** | 到点触发**原生系统通知** + 应用内 Toast，支持过期补提醒；主进程后台调度，关掉窗口也在跑 |
| **筛选 / 搜索** | 全部 / 待办 / 进行中 / 已完成 + 关键字搜索 |
| **番茄钟** | 内置 25 分钟专注计时 |
| **全局快捷键** | `Ctrl/Cmd + Shift + N` 一键唤起并新建任务 |
| **开机自启** | 托盘菜单一键开关（写入系统登录项） |

---

## 2. 架构（可插拔模块）

```
桌灵 DeskLing
├─ 主进程 (src/main)                Node 环境，拥有系统能力
│  ├─ index.js                      启动窗口 + 托盘 + 注册模块 + IPC 桥
│  ├─ tray.js                       系统托盘与右键上下文菜单
│  ├─ preload.js                   安全桥（contextBridge 暴露 window.api）
│  └─ modules/
│     └─ todo/                      模块 A：任务待办（后端）
│        ├─ index.js                注册 IPC、提供 trayItems、init()
│        ├─ store.js                JSON 持久化（用户数据目录）
│        └─ reminder.js             提醒调度器（原生通知）
│
└─ 渲染层 (src/renderer)            纯 UI，无 Node 权限
   ├─ index.html                   应用外壳（标题栏 + 侧边栏 + 内容区）
   ├─ css/style.css                通用样式
   └─ js/
      ├─ app.js                    外壳逻辑：模块导航 / 窗口控制 / 事件桥
      └─ modules/todo/             模块 A：任务待办（UI）
         ├─ todo.js                mount/unmount/openNew/onReminder
         └─ todo.css               模块私有样式
```

### 新增一个模块（示例）

1. 主进程：`src/main/modules/<name>/index.js`，导出
   ```js
   module.exports = {
     id: "clock", name: "时钟", icon: "🕒",
     init(ctx) { /* 注册 ctx.ipcMain.handle(...) */ },
     trayItems(ctx) { return [{ label: "xxx", click() {} }]; },
   };
   ```
   在 `src/main/index.js` 的 `MODULES` 数组里 `require` 并加入即可。
2. 渲染层：`src/renderer/js/modules/<name>/<name>.js`，向 `window.DeskLingModules.push({ id, name, icon, mount, unmount, openNew, onReminder })`。
3. 在 `index.html` 中 `<script>` 引入该模块文件（放在 `app.js` 之前）。

> 模块完全解耦：新增模块无需改动外壳与其他模块。

---

## 3. 本地开发

```bash
# 安装依赖（含 Electron）
npm install

# 启动应用（开发模式）
npm start
```

---

## 4. 打包为可安装程序

```bash
# Windows 安装包（在 Windows 上执行，生成 .exe 安装向导）
npm run dist:win

# macOS（在 macOS 上执行，生成 .dmg）
npm run dist:mac

# Linux（生成 AppImage + .deb）
npm run dist:linux

# 通用（按当前平台打包）
npm run dist
```

产物位于 `dist/` 目录：
- Windows：`桌灵 DeskLing-0.1.0-setup.exe`（NSIS 安装向导，需在 Windows 构建）
- macOS：`桌灵 DeskLing-0.1.0.dmg`（需在 macOS 构建）
- Linux：`桌灵 DeskLing-0.1.0.AppImage` / `桌灵 DeskLing-0.1.0.deb`

> 注：跨平台安装包建议在对应目标系统上构建（如 Windows 安装包最好在 Windows 构建）。本仓库已配置好 `electron-builder` 的 `win/mac/linux` 目标，CI 或本地按需选择。

### 4.1 通过 Gitee Go 自动发版（免费）

仓库已内置 Gitee Go 工作流 `.workflow/release.yml`：**推送以 `v` 开头的标签即自动构建** Linux（AppImage + deb）与 Windows（便携 zip，免 wine）安装包，并推回仓库的 `release-assets/<版本>/` 目录。

一次性启用步骤：
1. 进入仓库「流水线」页，点击「开通 Gitee Go」（免费，送构建时长）。
2. 在「流水线 → 设置 → 变量」新增私密变量 `GITEE_TOKEN`，值为你的 Gitee 私人令牌（需 repo 权限）。
3. 打标签发版：
   ```bash
   npm version patch          # 或手动改 package.json 的 version
   git tag v0.2.0
   git push origin v0.2.0     # 触发自动构建
   ```
4. 构建完成后，安装包出现在仓库 `release-assets/v0.2.0/`，登录 Gitee 即可下载。

> 限制：Gitee Go 的 Linux 构建机**无法出 macOS(.dmg)**，且免费档有月度构建分钟额度；Windows 在 Linux 上只能出「便携 zip」（无安装向导），`.exe` 安装包仍需在 Windows 本地 `npm run dist:win`。

### 4.2 下载说明（重要）

- 仓库当前为**公开**，但 Gitee 对 **>~50MB 的大二进制禁用匿名 raw 直链（返回 403）**。
- 因此**下载安装包请登录 Gitee 后**，通过「发行版 → 对应版本」或直接进入 `release-assets/<版本>/` 文件夹**点击文件下载**（走网页会话，正常可用）。
- 不要把 raw 文件链接发给未登录 Gitee 的人——对方会被 403 拦截。需要「任何人点开即下」可改用 GitHub Releases 或对象存储/CDN 托管安装包。

### 4.3 通过 GitHub Releases 实现「任何人点开即下载」（推荐）

Gitee 对大文件匿名下载有限制，而 **GitHub Releases 无此限制**：把仓库镜像到 GitHub 后，打 `v*` 标签即由 GitHub Actions（`.github/workflows/release.yml`）自动构建 **Windows `setup.exe` 安装向导 + 便携版、macOS `.dmg`、Linux AppImage/deb**，并上传到 Release，**任何人无需登录即可下载**，体验与你在 GitHub 截图里看到的一致。

一次性准备（需一个 GitHub 私人令牌，repo 权限）：

```bash
# 1) 在 GitHub 新建一个空仓库（如 desktop-todo）
# 2) 运行镜像脚本，把代码与标签推到 GitHub：
GITHUB_TOKEN=ghp_xxx GITHUB_REPO=你的用户名/desktop-todo bash scripts/mirror-to-github.sh
# 3) 在 GitHub 上给仓库打标签（或本地 git tag v0.2.0 && git push github v0.2.0）
#    → 自动构建并发布到 https://github.com/你的用户名/desktop-todo/releases
```

> 说明：macOS 包在无签名证书时构建为未签名 `.dmg`，用户首次打开会有 Gatekeeper 提示，属正常现象；如需去除需配置 Apple 开发者证书。

---

## 5. 数据存放

- 任务数据：`{用户数据目录}/todo.json`（如 Windows `%APPDATA%/桌灵 DeskLing/todo.json`）
- 用户数据不入库，互不影响。

---

## 6. 自动推送 Gitee

本仓库已配置 `post-commit` 钩子：每次 `git commit` 后自动 `git push` 到 Gitee（令牌已写入 remote URL，90 天内可复用）。

```bash
git add -A
git commit -m "feat: ..."
# 提交后自动推送，无需手动 push
```

---

## 7. 后续路线图

- [ ] 更多模块：日历视图、剪贴板历史、快捷笔记、系统监控
- [ ] 任务拖拽排序 / 看板视图
- [ ] 重复任务（每日 / 每周）
- [ ] 云同步（多端一致）
- [ ] Windows 资源管理器右键「新建待办」集成
- [ ] 统计报表（完成趋势）

---

## 8. 目录速览

```
desktop-todo/
├── package.json              # 依赖 + electron-builder 打包配置
├── build/icon.png            # 应用图标
├── src/
│   ├── main/                 # 主进程（Node）
│   └── renderer/             # 渲染层（UI）
└── dist/                     # 打包产物（构建后生成，已 gitignore）
```
