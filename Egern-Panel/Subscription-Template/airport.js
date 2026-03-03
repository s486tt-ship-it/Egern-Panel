/**
 * 机场流量信息解析脚本
 */

async function main() {
  // 解析传递的参数
  const args = $argument.split('&').reduce((acc, curr) => {
    const [k, v] = curr.split('=');
    acc[k] = v;
    return acc;
  }, {});

  const subUrl = args.url;

  if (!subUrl || subUrl.includes("请在此输入")) {
    $panel.update({ title: "配置提醒", content: "请先在模块参数中填入订阅链接" });
    $done();
    return;
  }

  try {
    const response = await $http.get({
      url: subUrl,
      headers: { "User-Agent": "Egern/2.16.0" }
    });

    // 获取标准流量头部 [4]
    const info = response.headers["subscription-userinfo"] || response.headers["Subscription-Userinfo"];

    if (!info) {
      $panel.update({ content: "订阅链接未返回有效的流量信息 (Missing Header)" });
      $done();
      return;
    }

    // 解析：upload=xxx; download=xxx; total=xxx; expire=xxx
    const data = info.split(';').reduce((acc, curr) => {
      const [key, val] = curr.trim().split('=');
      acc[key] = parseFloat(val);
      return acc;
    }, {});

    const usedGB = ((data.upload || 0) + (data.download || 0)) / (1024 ** 3);
    const totalGB = (data.total || 0) / (1024 ** 3);
    const remainingGB = totalGB - usedGB;
    const expireDate = data.expire ? new Date(data.expire * 1000).toLocaleDateString() : "永久有效";

    // 更新 Egern 面板内容 [2]
    $panel.update({
      content: `已用流量：${usedGB.toFixed(2)} GB\n剩余流量：${remainingGB.toFixed(2)} GB\n总计流量：${totalGB.toFixed(2)} GB\n到期时间：${expireDate}`
    });

  } catch (err) {
    $panel.update({ content: `获取失败: ${err.message}` });
  }

  $done();
}

main();
