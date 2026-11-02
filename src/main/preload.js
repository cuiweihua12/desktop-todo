// 预加载脚本：向渲染进程暴露安全、受控的桥接 API（contextIsolation 开启）
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // 请求/响应（带返回值）
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  // 单向发送（无返回值）
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  // 订阅主进程事件
  on: (channel, callback) =>
    ipcRenderer.on(channel, (event, ...args) => callback(...args)),
});
