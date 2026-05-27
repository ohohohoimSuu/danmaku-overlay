# Danmaku Overlay

游戏画面实时弹幕覆盖层。AI 分析你的游戏画面，生成直播风格的滚动弹幕。

## 使用

### 1. 设置 API Key

创建 `.env` 文件在 `danmaku-overlay/` 目录下：

```
MIMO_API_KEY=你的小米MiMo API密钥
```

### 2. 启动 Python 后端

```bash
cd python
pip install -r requirements.txt
python main.py              # 使用默认人格
python main.py slay-the-spire  # 使用杀戮尖塔人格
python main.py --list-profiles  # 查看所有可用人格
```

### 3. 启动 Electron 弹幕窗

```bash
cd electron
npm install
npm start
```

### 4. 开始游戏

弹幕会以透明悬浮窗形式出现在屏幕最上层，鼠标可穿透点击游戏。
右键系统托盘图标可暂停/退出。

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
