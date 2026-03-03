/**
 * 机场订阅详细 — Egern 2.16 流量面板 v2.1
 *
 * 功能：
 *  从持久化存储中读取订阅流量信息，格式化展示。
 *  展示数据由 sub_store.js 在更新订阅时被动采集。
 */

; (function () {
    "use strict";

    // =========================================================
    // 辅助函数
    // =========================================================

    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";
        var units = ["B", "KB", "MB", "GB", "TB"];
        var i = 0;
        var v = Number(bytes);
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return v.toFixed(2) + " " + units[i];
    }

    function formatDate(ts) {
        if (!ts || ts <= 0) return "永久有效";
        var d = new Date(Number(ts) * 1000);
        var yy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yy + "-" + mm + "-" + dd;
    }

    function daysLeft(ts) {
        if (!ts || ts <= 0) return "永久";
        var now = Math.floor(Date.now() / 1000);
        var diff = Number(ts) - now;
        if (diff <= 0) return "已过期";
        return Math.ceil(diff / 86400) + " 天";
    }

    function bar(used, total, width) {
        width = width || 10;
        if (!total || total <= 0) return "░".repeat(width);
        var ratio = Math.min(used / total, 1);
        var filled = Math.round(ratio * width);
        return "▓".repeat(filled) + "░".repeat(width - filled);
    }

    function trafficEmoji(used, total) {
        if (!total || total <= 0) return "⚪";
        var r = used / total;
        if (r >= 0.9) return "🔴";
        if (r >= 0.75) return "🟡";
        return "🟢";
    }

    function expireEmoji(ts) {
        if (!ts || ts <= 0) return "♾️";
        var now = Math.floor(Date.now() / 1000);
        var diff = Number(ts) - now;
        if (diff <= 0) return "❌";
        if (diff < 86400 * 7) return "⚠️";
        return "✅";
    }

    // =========================================================
    // 读取模板参数
    // =========================================================
    var argNames = ["airport1", "airport2", "airport3"];
    var nameMap = {};
    argNames.forEach(function (key) {
        var name = ($argument && $argument[key + "_name"]) ? String($argument[key + "_name"]).trim() : "";
        var url = ($argument && $argument[key + "_url"]) ? String($argument[key + "_url"]).trim() : "";
        if (name && url && url.indexOf("{{") === -1) {
            // 通过 url 中的 host 来匹配缓存数据
            var hostMatch = url.match(/^https?:\/\/([^/]+)/);
            if (hostMatch) {
                nameMap[hostMatch[1]] = name;
            }
        }
    });

    // =========================================================
    // 读取持久化存储的订阅列表
    // =========================================================
    var subList = [];
    try {
        var stored = $persistentStore.read("egern_sub_list");
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
        $done({
            title: "🛫 机场流量面板",
            content: "暂无订阅数据\n\n请先前往 Egern [订阅] 菜单\n点击你的机场订阅的「更新」按钮，\n脚本会自动采集流量数据并显示在这里。",
            icon: "airplane",
            color: "#8E8E93"
        });
        return;
    }

    var lines = [];
    subList.forEach(function (sub, idx) {
        // 优先使用用户在参数里填写的别名，否则用内置解析的 host
        var name = nameMap[sub.key] || sub.key || ("订阅 " + (idx + 1));
        var used = sub.used || 0;
        var remain = sub.remain || 0;
        var total = sub.total || 0;
        var expire = sub.expire || 0;
        var pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";

        lines.push("━━━ " + name + " ━━━");
        lines.push(trafficEmoji(used, total) + " [" + bar(used, total, 10) + "] " + pct + "%");
        lines.push("  已用：" + formatBytes(used) + " / 剩余：" + formatBytes(remain));
        lines.push(expireEmoji(expire) + " 到期：" + formatDate(expire) + "（余 " + daysLeft(expire) + "）");

        if (idx < subList.length - 1) lines.push("");
    });

    var now = new Date();
    var hh = String(now.getHours()).padStart(2, "0");
    var mi = String(now.getMinutes()).padStart(2, "0");
    lines.push("");
    lines.push("🕐 缓存更新于 " + hh + ":" + mi);

    $done({
        title: "🛫 机场流量面板",
        content: lines.join("\n"),
        icon: "airplane.departure",
        color: "#5856D6"
    });

})();
