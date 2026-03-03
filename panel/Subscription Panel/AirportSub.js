/**
 * Egern 机场订阅面板更新脚本
 * 
 * 通过解析订阅链接的 subscription-userinfo 响应头来显示流量和到期时间。
 * 支持通过脚本参数传递订阅地址和面板名称。
 */

const subUrl = $argument.url;
const panelName = $argument.panel_name || "airport_panel_1";
const airportName = $argument.name || "我的机场";

console.log(`[机场面板] 开始获取数据: ${airportName}, URL: ${subUrl}`);

// 检查订阅链接是否为空或为未替换的占位符
if (!subUrl || subUrl.trim() === "" || subUrl.indexOf("{") !== -1) {
    console.log("[机场面板] 订阅链接未配置或无效");
    updatePanel(airportName, "⚠️ 未配置订阅链接\n请在 Egern 模块参数中填写正确的 URL。");
    $done();
} else {
    const options = {
        url: subUrl,
        headers: {
            'User-Agent': 'Clash' // 使用 Clash UA 以确保机场返回流量信息
        },
        timeout: 10000
    };

    $httpClient.get(options, (error, response, data) => {
        if (error) {
            console.log(`[机场面板] 获取订阅失败: ${error}`);
            updatePanel(airportName, `❌ 连接失败\n无法获取订阅信息，请检查网络。\n${error}`);
            $done();
            return;
        }

        // 获取流量信息头 (不区分大小写)
        let infoHeader = null;
        for (let key in response.headers) {
            if (key.toLowerCase() === 'subscription-userinfo') {
                infoHeader = response.headers[key];
                break;
            }
        }
        
        if (!infoHeader) {
            console.log("[机场面板] 响应头中未找到 subscription-userinfo");
            updatePanel(airportName, "⚠️ 无法解析流量信息\n该订阅链接未提供标准流量统计头。");
            $done();
            return;
        }

        console.log(`[机场面板] 成功获取流量信息: ${infoHeader}`);
        const info = parseUserInfo(infoHeader);
        const content = formatPanelContent(info);
        
        updatePanel(airportName, content);
        $done();
    });
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
