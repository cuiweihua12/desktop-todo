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
- Windows：`桌灵 DeskLing-0.1.0-setup.exe`
- macOS：`桌灵 DeskLing-0.1.0.dmg`
- Linux：`桌灵 DeskLing-0.1.0.AppImage` / `桌灵 DeskLing-0.1.0.deb`

> 注：跨平台安装包建议在对应目标系统上构建（如 Windows 安装包最好在 Windows 构建）。本仓库已配置好 `electron-builder` 的 `win/mac/linux` 目标，CI 或本地按需选择。

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
