/**
 * Egern 机场订阅面板更新脚本
 * 
 * 通过解析订阅链接的 subscription-userinfo 响应头来显示流量和到期时间。
 * 支持通过脚本参数传递订阅地址和面板名称。
 */

const subUrl = $argument.url;
const panelName = $argument.panel_name || "airport_panel";
const airportName = $argument.name || "我的机场";

if (!subUrl || subUrl.trim() === "") {
    console.log("未提供订阅链接");
    updatePanel(airportName, "未配置订阅链接，请在模块参数中设置。");
    $done();
    return;
}

const options = {
    url: subUrl,
    headers: {
        'User-Agent': 'Egern/2.0'
    }
};

$httpClient.get(options, (error, response, data) => {
    if (error) {
        console.log("获取订阅失败: " + error);
        updatePanel("❌ 连接失败", "无法获取订阅信息，请检查链接或网络。");
        $done();
        return;
    }

    // 获取流量信息头 (subscription-userinfo)
    const infoHeader = response.headers['subscription-userinfo'] || response.headers['Subscription-Userinfo'];
    
    if (!infoHeader) {
        console.log("响应头中未找到 subscription-userinfo");
        updatePanel("⚠️ 无法解析", "该订阅链接未提供流量统计信息。");
        $done();
        return;
    }

    const info = parseUserInfo(infoHeader);
    const content = formatPanelContent(info);
    
    updatePanel(airportName, content);
    $done();
});

/**
 * 解析 subscription-userinfo 头
 * 格式: upload=100; download=200; total=1000; expire=1672531200
 */
function parseUserInfo(header) {
    const info = {};
    const items = header.split(';');
    items.forEach(item => {
        const [key, value] = item.split('=').map(s => s.trim());
        if (key && value) {
            info[key] = parseFloat(value);
        }
    });
    return info;
}

/**
 * 格式化面板内容
 */
function formatPanelContent(info) {
    const upload = info.upload || 0;
    const download = info.download || 0;
    const total = info.total || 0;
    const expire = info.expire;

    const used = upload + download;
    const remaining = total - used;
    const usagePercent = total > 0 ? (used / total * 100).toFixed(1) : 0;

    let content = [];

    // 流量行
    content.push(`📊 流量: ${bytesToSize(used)} / ${bytesToSize(total)} (${usagePercent}%)`);
    
    // 进度条
    content.push(generateProgressBar(used, total));

    // 剩余流量
    content.push(`剩余流量: ${bytesToSize(remaining > 0 ? remaining : 0)}`);

    // 到期时间
    if (expire) {
        const expireDate = new Date(expire * 1000);
        const now = new Date();
        const diffDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24));
        const expireStr = expireDate.toLocaleDateString('zh-CN');
        content.push(`📅 到期: ${expireStr} (剩余 ${diffDays > 0 ? diffDays : 0} 天)`);
    } else {
        content.push(`📅 到期: 永久有效`);
    }

    return content.join('\n');
}

/**
 * 更新面板
 */
function updatePanel(title, content) {
    $panel.update({
        name: panelName,
        title: title,
        content: content,
        icon: "airplane.circle"
    });
}

/**
 * 字节转可读单位
 */
function bytesToSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成简单的进度条
 */
function generateProgressBar(used, total) {
    if (total <= 0) return "━━━━━━━━━━━━";
    const totalBlocks = 12;
    const usedBlocks = Math.min(totalBlocks, Math.round((used / total) * totalBlocks));
    const emptyBlocks = totalBlocks - usedBlocks;
    return "█".repeat(usedBlocks) + "░".repeat(emptyBlocks);
}
