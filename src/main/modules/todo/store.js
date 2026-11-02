// 待办模块数据存储：JSON 文件持久化（位于用户数据目录）
const fs = require("fs");
const path = require("path");

class TodoStore {
  constructor(app) {
    this.file = path.join(app.getPath("userData"), "todo.json");
    this.data = { tasks: [] };
    this.load();
  }

  load() {
    try {
      const raw = fs.readFileSync(this.file, "utf-8");
      this.data = JSON.parse(raw);
    } catch (e) {
      this.data = { tasks: [] };
    }
    if (!Array.isArray(this.data.tasks)) this.data.tasks = [];
  }

  save() {
    try {
      fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.error("保存待办数据失败:", e);
    }
  }

  list() {
    return this.data.tasks;
  }

  add(d) {
    const now = Date.now();
    const task = {
      id: now + "_" + Math.random().toString(36).slice(2, 7),
      title: (d.title || "").trim(),
      category: d.category || "",
      priority: d.priority || "mid",
      due: d.due || null,
      progress: Math.max(0, Math.min(100, parseInt(d.progress) || 0)),
      status: "todo",
      reminderAt: d.reminderAt || null,
      reminded: false,
      note: d.note || "",
      createdAt: now,
      completedAt: null,
    };
    if (task.progress >= 100) task.status = "done";
    this.data.tasks.push(task);
    this.save();
    return task;
  }

  update(id, patch) {
    const t = this.data.tasks.find((x) => x.id === id);
    if (!t) return null;
    Object.assign(t, patch);
    if (patch.progress != null) {
      t.progress = Math.max(0, Math.min(100, parseInt(patch.progress) || 0));
      if (t.progress >= 100) {
        t.status = "done";
        t.completedAt = Date.now();
      } else if (t.status === "done") {
        t.status = "doing";
      }
    }
    if (patch.reminderAt != null && patch.reminderAt > Date.now()) {
      t.reminded = false; // 改到未来时间则重新允许提醒
    }
    this.save();
    return t;
  }

  remove(id) {
    const before = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((x) => x.id !== id);
    this.save();
    return before !== this.data.tasks.length;
  }

  cycleStatus(id) {
    const t = this.data.tasks.find((x) => x.id === id);
    if (!t) return null;
    const next =
      t.status === "todo" ? "doing" : t.status === "doing" ? "done" : "todo";
    t.status = next;
    if (next === "done") {
      t.progress = 100;
      t.completedAt = Date.now();
    }
    this.save();
    return t;
  }
}

module.exports = TodoStore;
