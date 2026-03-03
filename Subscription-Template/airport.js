/**
 * 机场订阅流量信息获取脚本 - 增强版
 * 支持多个订阅链接，实时显示流量使用和到期时间
 */

async function main() {
  // 解析传递的参数
  const args = $argument.split('&').reduce((acc, curr) => {
    const [k, v] = curr.split('=');
    acc[k] = decodeURIComponent(v);
    return acc;
  }, {});

  const subUrls = args.urls ? args.urls.split(';').map(u => u.trim()) : [];
  
  if (!subUrls || subUrls.length === 0 || subUrls[0].includes("请在此输入")) {
    $panel.update({ 
      title: "配置提醒", 
      content: "请先在模块参数中填入订阅链接（多个链接用;分隔）" 
    });
    $done();
    return;
  }

  try {
    let panelContent = "🛫 订阅机场流量信息\n" + "=".repeat(20) + "\n\n";

    // 获取所有订阅的数据
    for (let i = 0; i < subUrls.length; i++) {
      const url = subUrls[i];
      try {
        const response = await $http.get({
          url: url,
          headers: { "User-Agent": "Egern/2.16.0" }
        });

        const info = response.headers["subscription-userinfo"] || response.headers["Subscription-Userinfo"]; 
        
        if (!info) {
          panelContent += `❌ 机场 ${i + 1}: 无法获取流量信息\n`;
          continue;
        }

        // 解析流量数据：upload=xxx; download=xxx; total=xxx; expire=xxx
        const data = info.split(';').reduce((acc, curr) => {
          const [key, val] = curr.trim().split('=');
          acc[key] = parseFloat(val);
          return acc;
        }, {});

        const usedGB = ((data.upload || 0) + (data.download || 0)) / (1024 ** 3);
        const totalGB = (data.total || 0) / (1024 ** 3);
        const remainingGB = totalGB - usedGB;
        const usagePercent = totalGB > 0 ? ((usedGB / totalGB) * 100).toFixed(1) : 0;
        
        // 转换到期时间
        let expireDate = "永久有效";
        if (data.expire) {
          const expireTime = new Date(data.expire * 1000);
          const now = new Date();
          const daysLeft = Math.ceil((expireTime - now) / (1000 * 60 * 60 * 24));
          expireDate = `${expireTime.toLocaleDateString()} (剩余${daysLeft}天)`;
        }

        // 组织显示内容
        panelContent += `✈️ 机场 ${i + 1}\n`;
        panelContent += `├ 已用流量: ${usedGB.toFixed(2)} GB\n`;
        panelContent += `├ 剩余流量: ${remainingGB.toFixed(2)} GB\n`;
        panelContent += `├ 总流量: ${totalGB.toFixed(2)} GB\n`;
        panelContent += `├ 使用率: ${usagePercent}%\n`;
        panelContent += `└ 到期时间: ${expireDate}\n\n`;

      } catch (err) {
        panelContent += `⚠️ 机场 ${i + 1}: ${err.message}\n\n`;
      }
    }

    $panel.update({
      content: panelContent
    });

  } catch (err) {
    $panel.update({ content: `获取失败: ${err.message}` });
  }

  $done();
}

main();