// 系统托盘：图标 + 右键上下文菜单（桌面右键配合的核心）
const { Tray, Menu, nativeImage, app } = require("electron");
const path = require("path");

function createTray(ctx, modules) {
  const iconPath = path.join(__dirname, "..", "..", "build", "icon.png");
  let img = nativeImage.createFromPath(iconPath);
  if (img.isEmpty()) img = nativeImage.createEmpty();

  const tray = new Tray(img);
  tray.setToolTip("桌灵 DeskLing");

  // 收集各模块提供的托盘菜单项
  const moduleItems = modules
    .filter((m) => m.trayItems)
    .flatMap((m) => m.trayItems(ctx));

  const template = [
    { label: "显示主面板", click: () => ctx.showAndFocus() },
    { type: "separator" },
    ...moduleItems,
    { type: "separator" },
    {
      label: "开机自启",
      type: "checkbox",
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) =>
        app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { label: "退出", click: () => ctx.getWindow() && app.quit() },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));

  // 左键点击：显示/聚焦主面板
  tray.on("click", () => ctx.showAndFocus());

  return tray;
}

module.exports = createTray;
