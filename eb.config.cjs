// 仅用于「非 Windows 主机交叉构建 Windows 包」的临时配置：
// 1) 跳过 exe 签名（默认签名需 wine，沙箱无 wine）
// 2) 仅产出 zip（portable 目标在无 wine 环境同样需要 wine）
// 正常在 Windows 上执行 `npm run dist:win` 无需此文件（会走 nsis/portable/zip + 签名）。
module.exports = {
  win: {
    target: ["zip"],
    sign: async () => {
      // no-op：跳过 Windows 代码签名
      return false;
    },
  },
};
