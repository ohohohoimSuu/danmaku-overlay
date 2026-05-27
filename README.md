# Danmaku Overlay

游戏画面实时弹幕覆盖层。AI 分析你的游戏画面，生成直播风格的滚动弹幕。

## 快速启动（一键）

双击 `DanmakuOverlay.bat` 即可启动。Electron 会自动 spawn Python 后端，退出时自动关闭。

**前置条件：**
- Python 3.10+ 已安装并加入 PATH
- `python/` 目录下已执行过 `pip install -r requirements.txt`
- `.env` 文件已配置 API Key

## 手动启动（开发调试）

### 1. 设置 API Key

创建 `.env` 文件在 `danmaku-overlay/` 目录下：

```
MIMO_API_KEY=你的小米MiMo API密钥
```

### 2. 安装 Python 依赖

```bash
cd python
pip install -r requirements.txt
```

### 3. 启动

```bash
# 方式一：一键启动
双击 DanmakuOverlay.bat

# 方式二：分别启动
cd python && python main.py          # 后端
cd electron && npm start             # 前端（新终端）
```

### 4. 开始游戏

弹幕会以透明悬浮窗形式出现在屏幕最上层，鼠标可穿透点击游戏。
右键系统托盘图标可暂停/退出。

## 打包为独立应用

```bash
cd electron
npm run build:dir        # 生成到 dist/win-unpacked/
npm run build            # 打包为 .zip（需要管理员权限或开发者模式）
```

> Windows 上打包为单文件 .exe 需要开启开发者模式或管理员权限（electron-builder 的 winCodeSign 需要创建 symlink）。

## 自定义人格

编辑 `python/profiles/` 下的 JSON 文件，修改 `system_prompt` 和 `catchphrases`。
复制一份新文件即可创建新人格。

### 人格配置字段

| 字段 | 说明 |
|------|------|
| `name` | 人格名称 |
| `system_prompt` | AI 的系统提示词，定义观众人设和弹幕风格 |
| `catchphrases` | 常用梗和口头禅列表 |
| `focus_on` | 提示 AI 重点关注画面的哪些元素 |
| `max_per_batch` | 每次生成弹幕的最大条数 |
| `temperature` | 随机度 (0-1)，越高越天马行空 |

## 成本

使用小米 MiMo V2.5 API：约 ¥0.84/小时（开启帧差异检测后）
