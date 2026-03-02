# 机场订阅详细 — Egern 2.16 流量面板

> 查看机场订阅的**已用流量**、**剩余流量**和**到期时间**。支持同时显示多个机场。

## 文件说明

| 文件 | 用途 |
|------|------|
| `SubPanel.yaml` | Egern 模块配置，导入此文件即可启用面板 |
| `sub_store.js` | HTTP 响应拦截脚本，解析 `subscription-userinfo` 头并存储数据 |
| `sub_panel.js` | 面板展示脚本，读取存储数据并格式化输出 |

---

## 工作原理

机场订阅服务器在响应头中携带 `subscription-userinfo` 字段：

```
subscription-userinfo: upload=1073741824; download=5368709120; total=107374182400; expire=1780000000
```

`sub_store.js` 拦截此响应头 → 解析并存入 `$persistentStore` → `sub_panel.js` 读取数据展示到面板。

---

## 安装步骤

### 方式一：导入本地 YAML 模块（推荐）

1. 将 `SubPanel.yaml` 和 `sub_store.js`、`sub_panel.js` 下载到 iPhone 本地（建议放在 iCloud Drive）
2. 修改 `SubPanel.yaml` 中的 `script_url`，改为脚本文件的**绝对路径**，例如：
   ```yaml
   script_url: /var/mobile/Library/Mobile Documents/com~apple~CloudDocs/Egern/scripts/sub_panel.js
   ```
3. Egern → **模块** → **+** → **本地文件** → 选择 `SubPanel.yaml`
4. 启用模块 ✅

### 方式二：使用远程 URL

将以下 URL 粘贴到 Egern 模块输入框：

```
https://raw.githubusercontent.com/s486tt-ship-it/Egern-Panel/main/Egern-Panel/%E8%87%AA%E5%88%B6-Panel/%E6%9C%BA%E5%9C%BA%E8%AE%A2%E9%98%85%E8%AF%A6%E7%BB%86/SubPanel.yaml
```

> ⚠️ 使用远程 URL 方式时，`SubPanel.yaml` 中的 `script_url` 也需要改为远程 URL（raw 链接）。

---

## 使用方法

1. 导入模块后，前往 Egern **订阅**页，点击更新按钮更新任意机场订阅
2. 脚本自动拦截响应并解析流量信息
3. 前往 Egern **面板**页查看结果

---

## 面板效果预览

```
🛫 机场流量面板
━━━ airport.example.com ━━━
🟡 [▓▓▓▓▓▓▓░░░] 73.2%
  已用：78.52 GB
  剩余：28.72 GB
  总量：107.37 GB
✅ 到期：2026-05-20（余 77 天）

━━━ another.airport.com ━━━
🟢 [▓▓░░░░░░░░] 21.4%
  已用：22.98 GB
  剩余：84.39 GB
  总量：107.37 GB
⚠️ 到期：2026-03-10（余 7 天）

🕐 更新于 07:15
```

**状态图标**：
- 流量使用：🟢 < 75% | 🟡 75~90% | 🔴 > 90%  
- 到期状态：✅ 正常 | ⚠️ 7 天内到期 | ❌ 已过期

---

## 自定义匹配规则

如果默认规则无法匹配你的机场订阅链接，请修改 `SubPanel.yaml` 中的 `match` 字段：

```yaml
# 精确匹配你的机场域名（推荐）
match: "^https://your-airport-domain\\.com/.*"

# 或者使用宽泛匹配（匹配所有 HTTPS 请求，性能较差）
match: "^https://.*"
```

---

## 常见问题

**Q：面板显示"暂无订阅数据"？**  
A：请先更新订阅。如果仍无数据，说明机场订阅链接不包含 `subscription-userinfo` 头（部分机场不支持此标准）。

**Q：如何支持所有机场？**  
A：修改 `match` 正则，确保覆盖你的机场订阅 URL。

**Q：数据何时更新？**  
A：每次在 Egern 中点击更新订阅时自动更新，面板不会主动请求网络。
