# Egern-Panel

机场订阅流量聚合面板，支持 Surge / Egern。
当前版本采用单面板聚合展示方案，最多显示 10 个已启用订阅，未填写的订阅不会出现在面板中。

## 安装方式

模块地址：

```text
https://raw.githubusercontent.com/s486tt-ship-it/Egern-Panel/main/机场流量信息面板.sgmodule
```

在 Surge / Egern 中将上面的链接作为模块导入即可。

## 本次升级内容

- 订阅数量从 3 个扩展到 10 个。
- 支持直接填写原始机场订阅链接，不再需要手动 URL 编码。
- 未启用的订阅会自动隐藏，不占用面板空间。
- 订阅名称可留空，脚本会自动回退为订阅链接域名。
- 增强 clash-verge-rev / clash-verge / mihomo 兼容请求策略。
- 自动尝试常见变体参数：`flag=clash`、`flag=meta`、`target=clash`、`target=clash-meta`、`client=clash-verge-rev`。

## 参数说明

- `NAME1` 到 `NAME10`：订阅显示名称，可留空。
- `URL1` 到 `URL10`：机场订阅链接，直接填写原始链接即可。
- `RESET_Day1` 到 `RESET_Day10`：每月流量重置日，可选，填写 `1-31`。

## 面板显示内容

每个已启用订阅会显示：

- 已用流量 / 总流量
- 流量使用百分比
- 到期日期（如果服务端返回）
- 距离下次重置的剩余天数（如果设置了重置日）

## 兼容性说明

脚本通过读取响应头中的 `subscription-userinfo` 获取流量信息。
为了尽量贴近 clash-verge-rev 的兼容行为，脚本会依次尝试：

- `HEAD` 请求，模拟 Quantumult X
- `GET` 请求，模拟 clash-verge-rev
- `GET` 请求，模拟 clash-verge
- `GET` 请求，模拟 mihomo
- 自动追加常见查询参数变体

如果某个机场本身不返回 `subscription-userinfo`，面板仍然无法凭空推导出流量信息。这属于机场服务端限制，而不是脚本还能继续兼容的范围。