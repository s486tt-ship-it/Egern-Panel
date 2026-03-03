/**
 * Egern 机场订阅流量解析脚本
 * 逻辑：获取 subscription-userinfo 头部并解析 [4, 5]
 */

async function main() {
  // 从 argument 中提取 SUB_URL 参数
  const args = $argument.split('&').reduce((acc, curr) => {
    const [k, v] = curr.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const url = args.url;

  if (!url || url.includes("请在此处输入")) {
    $panel.update({
      title: "错误",
      content: "未检测到有效的订阅链接，请在模块参数中配置。"
    });
    $done();
    return;
  }

  try {
    const response = await $http.get({
      url: url,
      headers: { "User-Agent": "Egern/2.0" }
    });

    // 解析机场标准头部：subscription-userinfo
    const info = response.headers["subscription-userinfo"] || response.headers["Subscription-Userinfo"];
    
    if (!info) {
      $panel.update({ content: "此订阅链接未返回流量信息 (Header Missing)" });
      $done();
      return;
    }

    // 格式：upload=xxx; download=xxx; total=xxx; expire=xxx
    const data = info.split(';').reduce((acc, curr) => {
      const [key, val] = curr.trim().split('=');
      acc[key] = parseFloat(val);
      return acc;
    }, {});

    const used = (data.upload + data.download) / 1024 / 1024 / 1024;
    const total = data.total / 1024 / 1024 / 1024;
    const remaining = total - used;
    const expireDate = data.expire ? new Date(data.expire * 1000).toLocaleDateString() : "永久有效";

    // 更新面板内容 [6]
    $panel.update({
      content: `已用流量：${used.toFixed(2)} GB\n剩余流量：${remaining.toFixed(2)} GB\n总计流量：${total.toFixed(2)} GB\n到期时间：${expireDate}`
    });

  } catch (err) {
    $panel.update({ content: `获取失败: ${err.message}` });
  }

  $done();
}

main();
