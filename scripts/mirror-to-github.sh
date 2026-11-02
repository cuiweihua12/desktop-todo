#!/usr/bin/env bash
# ============================================================
# 把本仓库镜像到 GitHub，并推送所有 tag。
# 之后在 GitHub 上打 v* 标签即触发 .github/workflows/release.yml
# 自动构建三平台安装包并发布到 GitHub Releases（任何人可下载）。
#
# 用法：
#   GITHUB_TOKEN=ghp_xxx GITHUB_REPO=你的用户名/desktop-todo bash scripts/mirror-to-github.sh
# ============================================================
set -euo pipefail

: "${GITHUB_TOKEN:?请设置环境变量 GITHUB_TOKEN（GitHub 私人令牌，需 repo 权限）}"
: "${GITHUB_REPO:?请设置环境变量 GITHUB_REPO，格式为 用户名/仓库名}"

REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

# 添加 / 更新 github 远程
if git remote | grep -q '^github$'; then
  git remote set-url github "$REMOTE_URL"
else
  git remote add github "$REMOTE_URL"
fi

echo "==> 推送 main 分支"
git push github main --force

echo "==> 推送所有标签（GitHub Actions 将自动为每个 v* 标签构建发版）"
git push github --tags --force

echo "完成。请到 https://github.com/${GITHUB_REPO}/releases 查看构建与下载。"
