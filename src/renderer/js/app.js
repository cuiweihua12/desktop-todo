// 应用外壳逻辑：侧边栏模块导航、窗口控制、主进程事件桥接
(function () {
  "use strict";

  // 各模块在加载时向该数组注册自身（见 js/modules/*/xxx.js）
  window.DeskLingModules = window.DeskLingModules || [];

  const nav = document.getElementById("moduleNav");
  const content = document.getElementById("content");
  let activeModule = null;

  // ---------- 侧边栏：渲染模块导航 ----------
  function renderNav() {
    nav.innerHTML = "";
    window.DeskLingModules.forEach((m) => {
      const el = document.createElement("div");
      el.className = "nav-item" + (m === activeModule ? " active" : "");
      el.innerHTML = `<span class="ic">${m.icon || "•"}</span><span>${m.name}</span>`;
      el.onclick = () => activate(m);
      nav.appendChild(el);
    });
    // 占位：未来模块的入口提示
    const soon = document.createElement("div");
    soon.className = "nav-item soon";
    soon.innerHTML = `<span class="ic">＋</span><span>更多模块…</span>`;
    nav.appendChild(soon);
  }

  function activate(m) {
    if (activeModule && activeModule.unmount) activeModule.unmount();
    activeModule = m;
    renderNav();
    content.innerHTML = "";
    if (m.mount) m.mount(content, window.api);
  }

  // ---------- 窗口控制 ----------
  document.getElementById("btnMin").onclick = () => window.api.send("win:minimize");
  document.getElementById("btnClose").onclick = () => window.api.send("win:close");
  document.getElementById("btnTop").onclick = (e) => {
    window.api.send("win:toggle-top");
    e.currentTarget.style.color = e.currentTarget.style.color ? "" : "var(--accent)";
  };
  document.getElementById("btnQuit").onclick = () => window.api.send("app:quit");
  document.getElementById("btnAbout").onclick = () =>
    toast("桌灵 DeskLing", "可插拔模块桌面助手 · v0.1.0\n当前模块：任务待办");

  // ---------- 主进程事件 ----------
  // 托盘/全局快捷键触发的「新建任务」
  window.api.on("module:new-todo", () => {
    if (activeModule && activeModule.id !== "todo") activate(getTodo());
    if (activeModule && activeModule.openNew) activeModule.openNew();
  });
  // 主进程提醒到达：交给当前模块的回调，并弹 Toast
  window.api.on("todo:reminder", (task) => {
    toast("⏰ 任务提醒", task.title + (task.category ? `（${task.category}）` : ""));
    if (activeModule && activeModule.onReminder) activeModule.onReminder(task);
  });

  function getTodo() {
    return window.DeskLingModules.find((m) => m.id === "todo");
  }

  // ---------- 全局 Toast ----------
  window.toast = function (title, body) {
    let box = document.getElementById("toasts");
    if (!box) {
      box = document.createElement("div");
      box.id = "toasts";
      document.body.appendChild(box);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<div class="tt"></div><div></div>`;
    el.querySelector(".tt").textContent = title;
    el.querySelector("div:last-child").textContent = body;
    box.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  };

  // ---------- 启动 ----------
  function boot() {
    // 默认激活第一个模块（任务待办）
    activeModule = window.DeskLingModules[0] || null;
    renderNav();
    if (activeModule && activeModule.mount) activeModule.mount(content, window.api);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
