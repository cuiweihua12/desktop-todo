// 主进程入口：应用启动、主窗口、托盘、模块注册、IPC 桥接
const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const createTray = require("./tray");

// ===== 可插拔模块注册表 =====
// 后续新增模块：在 src/main/modules/ 下建目录，导出 { id, name, icon, init, trayItems }
// 然后在此处 require 并加入 modules 数组即可，无需改动其他代码。
const todoModule = require("./modules/todo");

const MODULES = [todoModule];

// 主进程共享上下文，传给各模块
const ctx = {
  app,
  ipcMain,
  getWindow: () => win,
  showAndFocus: () => {
    if (win) {
      win.show();
      win.focus();
    }
  },
};

let win = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width: 940,
    height: 680,
    minWidth: 760,
    minHeight: 560,
    frame: false, // 无边框，由渲染层自定义标题栏
    transparent: false,
    backgroundColor: "#0f1118",
    title: "桌灵 DeskLing",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  // 关闭窗口时不退出应用，保留托盘（点击托盘可再次唤起）
  win.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function registerWindowIpc() {
  ipcMain.on("win:minimize", () => win && win.minimize());
  ipcMain.on("win:close", () => win && win.hide());
  ipcMain.on("win:toggle-top", () => {
    if (win) win.setAlwaysOnTop(!win.isAlwaysOnTop());
  });
  ipcMain.on("app:quit", () => {
    app.isQuiting = true;
    app.quit();
  });
}

app.whenReady().then(() => {
  createWindow();
  registerWindowIpc();

  // 初始化所有模块（各模块自行注册 IPC 监听与后台任务）
  MODULES.forEach((m) => m.init && m.init(ctx));

  // 系统托盘 + 右键菜单（无托盘环境时降级，不阻塞主功能）
  try {
    tray = createTray(ctx, MODULES);
  } catch (e) {
    console.warn("托盘初始化失败，已跳过：", e);
  }

  // 全局快捷键：Ctrl/Cmd + Shift + N 快速唤起并新建任务
  try {
    globalShortcut.register("CommandOrControl+Shift+N", () => {
      ctx.showAndFocus();
      const w = ctx.getWindow();
      if (w) w.webContents.send("module:new-todo");
    });
  } catch (e) {
    /* 快捷键注册失败不影响主功能 */
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 保留托盘运行时，窗口全部关闭不退出
app.on("window-all-closed", () => {
  /* 不调用 app.quit()，应用常驻托盘 */
});
