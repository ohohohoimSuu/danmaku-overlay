# SECURITY.md — API 密钥安全教训

## ⚠️ 事故记录

**日期**: 2026-05-27 ~ 2026-05-30  
**严重程度**: 中（私有仓库，未公开泄露）  
**影响**: API Key 以明文形式提交到 Git 历史中，任何有仓库访问权限的人都能看到

## 发生了什么

在 `DanmakuSettings.bat` 中硬编码了 MiMo API Key：

```bat
set "MIMO_API_KEY=tp-crbvsqkfk0ywemopv3ltnamjmzsyrwe99nx7ghwcamyziit9"
set "MIMO_API_BASE=https://token-plan-cn.xiaomimimo.com/v1"
```

文件随 commit `c883a8d` 提交并推送到 GitHub。虽然仓库是私有的，但如果仓库日后被设为公开、或有外部协作者加入，密钥就会暴露。

## 修复措施

1. **吊销旧 Key** → 去 MiMo 后台重新申请
2. **清理 git 历史** → 使用 `git filter-branch` 从所有 44 个 commit 中替换 Key 为占位符
3. **重写 bat 文件** → 改为注释提示，不再包含真实 Key
4. **更新 .gitignore** → 确保 `api-config.json`、`display-config.json`、`.env`、`key.txt` 被排除

## 🚫 以后绝对不能做的事

- ❌ **绝不在 .bat / .sh / .ps1 脚本里硬编码密钥**
- ❌ **绝不在任何会提交到 git 的文件里写密钥**（包括注释）
- ❌ **绝不把 `api-config.json` 或 `.env` 提交到 git**

## ✅ 正确的做法

1. **开发时**: 使用 `.env` 文件（已在 `.gitignore` 中排除）
2. **分发给用户时**: 
   - 在 bat 脚本中提示用户自己去申请 Key
   - 或使用应用内设置面板（API 设置标签页）填写，自动保存到 `api-config.json`
3. **CI/CD 中**: 使用 GitHub Secrets 或环境变量注入

## 提交前检查清单

每次 `git commit` 之前，确认：
- [ ] `git diff --cached` 里没有 API Key、Token、密码
- [ ] `.env` 和 `api-config.json` 没有被 `git add` 误加
- [ ] 新加的脚本文件（.bat/.sh/.ps1）里没有硬编码凭证
