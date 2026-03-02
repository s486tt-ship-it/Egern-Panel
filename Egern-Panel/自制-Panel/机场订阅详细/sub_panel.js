/**
 * Egern 机场流量面板展示脚本
 * 
 * 功能：从持久化存储中读取订阅流量信息，格式化展示
 * 每个机场的：已用流量、剩余流量、总流量、到期时间。
 * 
 * 面板配置（YAML 中 panels 段）调用此脚本时，
 * 通过 $done({ content: "...", icon: "...", color: "..." }) 返回面板内容。
 */

; (function () {
    "use strict";

    // =========================================================
    // 辅助函数
    // =========================================================

    /**
     * 将字节数格式化为人类可读字符串
     * @param {number} bytes
     * @returns {string}
     */
    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        let value = bytes;
        while (value >= 1024 && i < units.length - 1) {
            value /= 1024;
            i++;
        }
        return value.toFixed(2) + " " + units[i];
    }

    /**
     * 将 Unix 时间戳格式化为日期字符串
     * @param {number} ts  Unix 秒时间戳
     * @returns {string}
     */
    function formatDate(ts) {
        if (!ts || ts <= 0) return "未知";
        const d = new Date(ts * 1000);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    /**
     * 计算距离到期还有多少天
     * @param {number} expire Unix 秒时间戳
     * @returns {string}
     */
    function daysLeft(expire) {
        if (!expire || expire <= 0) return "永久";
        const now = Math.floor(Date.now() / 1000);
        const diff = expire - now;
        if (diff <= 0) return "已过期";
        const days = Math.ceil(diff / 86400);
        return `${days} 天`;
    }

    /**
     * 生成进度条字符串（ASCII 风格，10 格）
     * @param {number} used    已用字节
     * @param {number} total   总字节
     * @param {number} width   进度条宽度（字符数）
     * @returns {string}
     */
    function progressBar(used, total, width) {
        width = width || 10;
        if (!total || total <= 0) return "░".repeat(width);
        const ratio = Math.min(used / total, 1);
        const filled = Math.round(ratio * width);
        return "▓".repeat(filled) + "░".repeat(width - filled);
    }

    // =========================================================
    // 读取持久化存储中的订阅列表
    // =========================================================
    let subList = [];
    try {
        const stored = $persistentStore.read("egern_sub_list");
        if (stored) {
            subList = JSON.parse(stored);
            if (!Array.isArray(subList)) subList = [];
        }
    } catch (e) {
        console.log("[SubPanel] 读取数据失败:", e);
    }

    // =========================================================
    // 构建面板内容
    // =========================================================
    if (subList.length === 0) {
        // 暂无数据时的提示
        $done({
            title: "🛫 机场流量面板",
            content: "暂无订阅数据\n\n请先更新订阅以获取流量信息。\n\n提示：确保订阅链接已配置脚本拦截。",
            icon: "airplane",
            color: "#5856D6"
        });
        return;
    }

    // 遍历所有订阅，拼接面板文本
    const lines = [];

    subList.forEach(function (sub, idx) {
        const name = sub.key || `订阅 ${idx + 1}`;
        const used = sub.used || 0;
        const remain = sub.remain || 0;
        const total = sub.total || 0;
        const expire = sub.expire || 0;
        const bar = progressBar(used, total, 10);
        const usedPct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";

        // 到期状态 emoji
        const now = Math.floor(Date.now() / 1000);
        let expireEmoji = "✅";
        if (expire > 0) {
            const diff = expire - now;
            if (diff <= 0) expireEmoji = "❌";
            else if (diff < 86400 * 7) expireEmoji = "⚠️";
        }

        // 流量状态 emoji
        let trafficEmoji = "🟢";
        if (total > 0) {
            const ratio = used / total;
            if (ratio >= 0.9) trafficEmoji = "🔴";
            else if (ratio >= 0.75) trafficEmoji = "🟡";
        }

        // 每个订阅信息块
        lines.push(`━━━ ${name} ━━━`);
        lines.push(`${trafficEmoji} [${bar}] ${usedPct}%`);
        lines.push(`  已用：${formatBytes(used)}`);
        lines.push(`  剩余：${formatBytes(remain)}`);
        lines.push(`  总量：${formatBytes(total)}`);
        lines.push(`${expireEmoji} 到期：${formatDate(expire)}（余 ${daysLeft(expire)}）`);

        if (idx < subList.length - 1) {
            lines.push(""); // 订阅间空行
        }
    });

    // 更新时间
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    lines.push("");
    lines.push(`🕐 更新于 ${timeStr}`);

    // =========================================================
    // 返回面板内容
    // =========================================================
    $done({
        title: "🛫 机场流量面板",
        content: lines.join("\n"),
        icon: "airplane.departure",
        color: "#5856D6"
    });
})();
