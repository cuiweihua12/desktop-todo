// 待办模块：注册 IPC 处理、启动提醒调度、提供托盘菜单项
const TodoStore = require("./store");
const ReminderScheduler = require("./reminder");

let store = null;
let scheduler = null;
let ctxRef = null;

function init(ctx) {
  ctxRef = ctx;
  store = new TodoStore(ctx.app);
  scheduler = new ReminderScheduler(store, ctx);
  scheduler.start();

  // ---- IPC：渲染层 <-> 主进程 ----
  ctx.ipcMain.handle("todo:list", () => store.list());
  ctx.ipcMain.handle("todo:add", (e, data) => store.add(data));
  ctx.ipcMain.handle("todo:update", (e, id, patch) => store.update(id, patch));
  ctx.ipcMain.handle("todo:cycle", (e, id) => store.cycleStatus(id));
  ctx.ipcMain.handle("todo:delete", (e, id) => store.remove(id));
}

// 托盘右键菜单中本模块提供的项
function trayItems(ctx) {
  return [
    {
      label: "新建任务",
      click: () => {
        const w = ctx.getWindow();
        ctx.showAndFocus();
        if (w) w.webContents.send("module:new-todo");
      },
    },
    {
      label: "查看任务列表",
      click: () => ctx.showAndFocus(),
    },
  ];
}

module.exports = {
  id: "todo",
  name: "任务待办",
  icon: "✓",
  init,
  trayItems,
};
