# ✈️ 机场流量信息面板（三机场版）

> 同时显示三个机场的剩余流量信息以及套餐到期日期，支持 Surge / Egern 使用。

## 📦 一键订阅

```
https://raw.githubusercontent.com/s486tt-ship-it/Egern-Panel/main/机场流量信息面板.sgmodule
```

**安装方式**：在 Surge / Egern 中添加上方链接作为模块（Module）即可。

---

## ✨ 功能特性

- 🎯 同时支持 **3个机场** 订阅信息显示
- 📊 显示已用流量 / 总流量
- 📅 显示流量重置日期与到期时间
- 🎨 每个机场可独立自定义图标与颜色
- 🎪 **自动兼容非标机场**：内置容错重试机制，当原始订阅不返回流量头时自动附加 `&flag=clash` 请求获取信息（适配例如 mitce.net 等非标机场）

---

## ⚙️ 参数配置

安装模块后，在配置页面填写以下参数：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `NAME1` / `NAME2` / `NAME3` | 机场名称 | 机场1 / 机场2 / 机场3 |
| `URL1` / `URL2` / `URL3` | URL 编码后的机场订阅链接 | - |
| `RESET_Day1` / `RESET_Day2` / `RESET_Day3` | 流量每月重置日期（如26号填26） | 不显示重置日 |
| `ICON1` / `ICON2` / `ICON3` | SF Symbol 图标名称 | `externaldrive.fill.badge.icloud` |
| `COLOR1` / `COLOR2` / `COLOR3` | 图标颜色（HEX） | 🩷`#FFB6C1` / 🩵`#87CEEB` / 💚`#98FB98` |

### 📝 关于 URL 编码

机场订阅链接需要先进行 URL 编码后再填入。可使用在线工具如 [urlencoder.org](https://www.urlencoder.org/) 进行编码。

---

## 🔒 安全说明

本插件已经过代码安全审查，**确认安全**：

- ✅ 仅对用户配置的订阅 URL 发起 HEAD 请求读取流量信息
- ✅ 不读写本地文件，不收集任何用户数据
- ✅ 不向任何第三方发送信息
- ⚠️ 请妥善保管你的机场订阅链接，避免泄露

---

## 🙏 致谢与来源

本项目基于以下开源项目改造，感谢原作者的贡献：

| 作者 | 贡献 | 仓库 |
|------|------|------|
| **@mieqq** | 原始脚本编写 | [mieqq/mieqq](https://github.com/mieqq/mieqq) |
| **@Rabbit-Spec** | 脚本优化修改 | [Rabbit-Spec/Surge](https://github.com/Rabbit-Spec/Surge) |
| **@QingRex** | Surge/Egern 模块转制 | [QingRex/LoonKissSurge](https://github.com/QingRex/LoonKissSurge) |

**核心脚本**：[Sub-info.js](https://raw.githubusercontent.com/Rabbit-Spec/Surge/Master/Module/Panel/Sub-info/Moore/Sub-info.js)（由 @Rabbit-Spec 维护）

---

## 📄 许可

本项目仅供个人学习使用，请遵守原始项目的开源协议。如有侵权请联系删除。
