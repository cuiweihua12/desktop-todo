// 提醒调度器：定时扫描到期任务，触发原生通知 + 向渲染层推送事件
const { Notification } = require("electron");

class ReminderScheduler {
  constructor(store, ctx, intervalMs = 5000) {
    this.store = store;
    this.ctx = ctx;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  // 触达用户：主进程原生通知 + 渲染层 Toast
  fire(task) {
    try {
      new Notification({
        title: "⏰ 任务提醒",
        body: task.title + (task.category ? `（${task.category}）` : ""),
        silent: false,
      }).show();
    } catch (e) {
      console.error("通知失败:", e);
    }
    const w = this.ctx.getWindow();
    if (w) w.webContents.send("todo:reminder", task);
  }

  tick() {
    const now = Date.now();
    for (const t of this.store.list()) {
      if (t.reminderAt && !t.reminded && t.reminderAt <= now) {
        t.reminded = true;
        this.store.save();
        this.fire(t);
      }
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    // 启动后立即检查一次（如应用重启后存在已过期的未提醒任务）
    this.tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = ReminderScheduler;
