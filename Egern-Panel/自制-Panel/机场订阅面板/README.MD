针对你为 Egern 开发的“机场订阅流量信息面板”插件，以下是为你准备的 `README.md` 文件内容。它涵盖了模块的功能介绍、安装步骤以及参数配置说明，并附带了来源中提供的订阅链接。

***

# 机场订阅流量信息面板 (Egern Module)
订阅链接：https://raw.githubusercontent.com/s486tt-ship-it/Egern-Panel/main/Egern-Panel/%E8%87%AA%E5%88%B6-Panel/%E6%9C%BA%E5%9C%BA%E8%AE%A2%E9%98%85%E9%9D%A2%E6%9D%BF/airport_panel.yaml


订阅链接2:https://raw.githubusercontent.com/s486tt-ship-it/Egern-Panel/refs/heads/main/Egern-Panel/%E8%87%AA%E5%88%B6-Panel/%E6%9C%BA%E5%9C%BA%E8%AE%A2%E9%98%85%E9%9D%A2%E6%9D%BF/airport_panel.yaml

这是一个专门为 [Egern](https://apps.apple.com/app/egern/id1616145031) 设计的插件模块，旨在通过面板直观地展示机场订阅的使用状态。

## 🌟 功能介绍
*   **流量实时监控**：在面板上清晰显示已用流量、剩余流量及总流量。
*   **到期时间提醒**：自动解析并显示机场订阅的过期日期。
*   **动态参数配置**：支持在 Egern 界面中直接修改订阅链接，无需手动编辑脚本代码。

## 🛠️ 安装说明
1.  打开 **Egern** 应用，进入“模块 (Modules)”页面。
2.  点击添加新模块，输入你 GitHub 仓库中 `.yaml` 文件的原始链接 (Raw URL)。
3.  启用该模块后，面板功能将自动集成到 Egern 的主界面中。

## ⚙️ 模块参数配置
该插件使用 `compat_arguments` 功能进行配置。你可以通过以下步骤添加或修改订阅链接：
1.  在模块列表中点击本项目模块进入详情页。
2.  找到“**编辑模板参数** (Edit Arguments)”部分。
3.  在 `SUB_URL` 字段中填入你的机场订阅链接。

## 🔗 示例订阅链接
你可以使用以下链接作为测试或参考（源自公开数据）：
`https://sub01.sh-cloudflare.sbs:8443/api/v1/client/subscribe?token=571791988e327f4615fcaefff79c2f23`

---
**作者**: s486tt-ship-it
**项目仓库**: [Egern-Panel](https://github.com/s486tt-ship-it/Egern-Panel)

***
