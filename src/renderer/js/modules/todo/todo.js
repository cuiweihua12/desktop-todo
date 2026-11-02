// 任务待办模块（渲染层）：列表、进度、筛选、定时提醒、番茄钟
// 通过 window.api（preload 桥接）与主进程 IPC 通信
(function () {
  "use strict";

  const PRI = { high: "高", mid: "中", low: "低" };
  let api = null;
  let container = null;
  let state = { tasks: [], filter: "all", query: "" };
  let pomo = { sec: 25 * 60, running: false, iv: null };

  // ---------- 工具 ----------
  const $ = (sel, root = container) => root.querySelector(sel);
  const now = () => Date.now();
  const fmt = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const fromInput = (v) => (v ? new Date(v).getTime() : null);
  const toInput = (ts) => {
    if (!ts) return "";
    const d = new Date(ts - d.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16);
  };
  const esc = (s) =>
    (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 数据 ----------
  async function refresh() {
    state.tasks = (await api.invoke("todo:list")) || [];
    render();
  }

  // ---------- 渲染 ----------
  function render() {
    const tasks = state.tasks;
    const done = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    const pct = total ? Math.round(tasks.reduce((s, t) => s + (t.progress || 0), 0) / total) : 0;
    $("#pctText").textContent = pct + "%";
    $("#metaText").textContent = `${done} / ${total} 完成`;
    $("#progBar").style.width = pct + "%";
    $("#cAll").textContent = total;
    $("#cTodo").textContent = tasks.filter((t) => t.status === "todo").length;
    $("#cDoing").textContent = tasks.filter((t) => t.status === "doing").length;
    $("#cDone").textContent = done;

    let list = tasks.slice();
    if (state.filter === "todo") list = list.filter((t) => t.status === "todo");
    if (state.filter === "doing") list = list.filter((t) => t.status === "doing");
    if (state.filter === "done") list = list.filter((t) => t.status === "done");
    if (state.query)
      list = list.filter((t) =>
        (t.title + t.category + (t.note || "")).toLowerCase().includes(state.query.toLowerCase())
      );
    list.sort(
      (a, b) =>
        (b.priority === "high" ? 3 : b.priority === "mid" ? 2 : 1) -
          (a.priority === "high" ? 3 : a.priority === "mid" ? 2 : 1) ||
        a.createdAt - b.createdAt
    );

    const box = $("#taskList");
    if (!list.length) {
      box.innerHTML = `<div class="empty">暂无任务，点「＋ 新建任务」开始 ✦</div>`;
      return;
    }
    box.innerHTML = list
      .map((t) => {
        const overdue = t.due && t.status !== "done" && t.due < now();
        const remFired = t.reminderAt && t.reminderAt <= now();
        return `<div class="task ${t.status === "done" ? "done" : ""}" data-id="${t.id}">
          <div class="acts">
            <button data-act="edit" title="编辑">✎</button>
            <button data-act="del" title="删除">✕</button>
          </div>
          <div class="top">
            <div class="check" data-act="toggle"></div>
            <div class="name">${esc(t.title)}</div>
            <span class="pri ${t.priority}">${PRI[t.priority]}</span>
          </div>
          <div class="sub">
            ${t.category ? `<span class="tag">${esc(t.category)}</span>` : ""}
            ${t.due ? `<span class="due ${overdue ? "overdue" : ""}">⏰ ${fmt(t.due)}${overdue ? " 逾期" : ""}</span>` : ""}
            ${t.reminderAt ? `<span class="remind ${remFired ? "fired" : ""}">🔔 ${fmt(t.reminderAt)}</span>` : ""}
          </div>
          <div class="mini-bar"><i style="width:${t.progress || 0}%"></i></div>
        </div>`;
      })
      .join("");
  }

  // ---------- 弹窗（新增/编辑） ----------
  function openModal(task) {
    editingId = task ? task.id : null;
    $("#modalTitle").textContent = task ? "编辑任务" : "新建任务";
    $("#fTitle").value = task ? task.title : "";
    $("#fCategory").value = task ? task.category || "" : "";
    $("#fPriority").value = task ? task.priority : "mid";
    $("#fDue").value = task ? toInput(task.due) : "";
    $("#fProgress").value = task ? task.progress || 0 : 0;
    $("#fRemind").value = task ? toInput(task.reminderAt) : "";
    $("#fNote").value = task ? task.note || "" : "";
    $("#modalMask").classList.add("show");
  }
  let editingId = null;

  async function saveModal() {
    const title = $("#fTitle").value.trim();
    if (!title) {
      window.toast("提示", "请填写任务名称");
      return;
    }
    const data = {
      title,
      category: $("#fCategory").value.trim(),
      priority: $("#fPriority").value,
      due: fromInput($("#fDue").value),
      progress: Math.max(0, Math.min(100, parseInt($("#fProgress").value) || 0)),
      reminderAt: fromInput($("#fRemind").value),
      note: $("#fNote").value.trim(),
    };
    if (editingId) await api.invoke("todo:update", editingId, data);
    else await api.invoke("todo:add", data);
    closeModal();
    await refresh();
  }
  function closeModal() {
    $("#modalMask").classList.remove("show");
    editingId = null;
  }

  // ---------- 番茄钟 ----------
  function pomoTick() {
    pomo.sec--;
    if (pomo.sec < 0) {
      pomo.sec = 25 * 60;
      pomo.running = false;
      clearInterval(pomo.iv);
      $("#pomoToggle").textContent = "▶";
      window.toast("番茄钟", "一个专注周期结束 🍅");
    }
    $("#pomoTime").textContent = `${String(Math.floor(pomo.sec / 60)).padStart(2, "0")}:${String(pomo.sec % 60).padStart(2, "0")}`;
  }

  // ---------- 模块接口 ----------
  const module = {
    id: "todo",
    name: "任务待办",
    icon: "✓",
    mount(root, apiInstance) {
      api = apiInstance;
      container = root;
      // 注入模块级样式（仅一次）
      if (!document.getElementById("todo-css")) {
        const link = document.createElement("link");
        link.id = "todo-css";
        link.rel = "stylesheet";
        link.href = "js/modules/todo/todo.css";
        document.head.appendChild(link);
      }
      root.innerHTML = `
        <div class="module">
          <div class="module-head"><h2>任务待办</h2></div>
          <div class="stats">
            <div class="progress-row">
              <span class="pct" id="pctText">0%</span>
              <span class="meta" id="metaText">0 / 0 完成</span>
            </div>
            <div class="bar"><i id="progBar"></i></div>
            <div class="chips" id="filterChips">
              <span class="chip active" data-f="all">全部 <span id="cAll">0</span></span>
              <span class="chip" data-f="todo">待办 <span id="cTodo">0</span></span>
              <span class="chip" data-f="doing">进行中 <span id="cDoing">0</span></span>
              <span class="chip" data-f="done">已完成 <span id="cDone">0</span></span>
            </div>
          </div>
          <div class="toolbar">
            <div class="search">🔍 <input id="searchInput" placeholder="搜索任务…" /></div>
            <button class="btn primary" id="btnAdd">＋ 新建任务</button>
          </div>
          <div class="list" id="taskList"></div>
          <div class="pomo">
            🍅 <span class="t" id="pomoTime">25:00</span>
            <button id="pomoToggle">▶</button>
            <button id="pomoReset">↺</button>
            <span style="color:var(--text-dim)">专注计时</span>
          </div>
        </div>

        <div class="modal-mask" id="modalMask">
          <div class="modal">
            <h2 id="modalTitle">新建任务</h2>
            <div class="field"><label>任务名称 *</label><input id="fTitle" placeholder="例如：完成周报初稿" /></div>
            <div class="field row">
              <div><label>分类</label><input id="fCategory" placeholder="工作 / 学习" /></div>
              <div><label>优先级</label>
                <select id="fPriority"><option value="high">高</option><option value="mid" selected>中</option><option value="low">低</option></select>
              </div>
            </div>
            <div class="field row">
              <div><label>截止时间</label><input id="fDue" type="datetime-local" /></div>
              <div><label>进度 %</label><input id="fProgress" type="number" min="0" max="100" value="0" /></div>
            </div>
            <div class="field"><label>提醒时间（到点弹窗 + 系统通知）</label><input id="fRemind" type="datetime-local" /></div>
            <div class="field"><label>备注</label><textarea id="fNote" placeholder="可选"></textarea></div>
            <div class="actions">
              <button class="btn primary" id="btnSave" style="flex:2">保存</button>
              <button class="btn ghost" id="btnCancel">取消</button>
            </div>
          </div>
        </div>`;

      // 事件绑定
      $("#btnAdd").onclick = () => openModal(null);
      $("#btnSave").onclick = saveModal;
      $("#btnCancel").onclick = closeModal;
      $("#modalMask").addEventListener("click", (e) => {
        if (e.target === $("#modalMask")) closeModal();
      });
      $("#searchInput").oninput = (e) => {
        state.query = e.target.value;
        render();
      };
      $("#filterChips").addEventListener("click", (e) => {
        const c = e.target.closest(".chip");
        if (!c) return;
        state.filter = c.dataset.f;
        document.querySelectorAll("#filterChips .chip").forEach((x) => x.classList.toggle("active", x === c));
        render();
      });
      $("#taskList").addEventListener("click", async (e) => {
        const el = e.target.closest(".task");
        if (!el) return;
        const id = el.dataset.id;
        const act = e.target.dataset.act;
        if (act === "toggle") {
          await api.invoke("todo:cycle", id);
          await refresh();
        } else if (act === "edit") {
          openModal(state.tasks.find((t) => t.id === id));
        } else if (act === "del") {
          if (confirm("删除该任务？")) {
            await api.invoke("todo:delete", id);
            await refresh();
          }
        }
      });
      $("#pomoToggle").onclick = () => {
        if (pomo.running) {
          clearInterval(pomo.iv);
          pomo.running = false;
          $("#pomoToggle").textContent = "▶";
        } else {
          pomo.iv = setInterval(pomoTick, 1000);
          pomo.running = true;
          $("#pomoToggle").textContent = "⏸";
        }
      };
      $("#pomoReset").onclick = () => {
        clearInterval(pomo.iv);
        pomo.running = false;
        pomo.sec = 25 * 60;
        $("#pomoTime").textContent = "25:00";
        $("#pomoToggle").textContent = "▶";
      };

      refresh();
    },

    unmount() {
      if (pomo.iv) clearInterval(pomo.iv);
      pomo.running = false;
    },

    openNew() {
      openModal(null);
    },

    onReminder(task) {
      refresh();
    },
  };

  window.DeskLingModules.push(module);
})();
