/**
 * Egern 机场流量面板展示脚本 v2.0
 *
 * 功能：
 *  1. 读取 $argument 中用户配置的机场订阅链接
 *  2. 用 $httpClient 主动拉取每个订阅的响应头
 *  3. 解析 subscription-userinfo 获取流量和到期信息
 *  4. 格式化后通过 $done() 展示在 Egern 面板中
 *
 * 配置方式：
 *  在 Egern 模块"编辑模板参数"中填写机场名称和订阅链接
 */

; (function () {
    "use strict";

    // =========================================================
    // 辅助函数
    // =========================================================

    /** 字节 → 人类可读 */
    function formatBytes(bytes) {
        if (!bytes || bytes <= 0) return "0 B";
        var units = ["B", "KB", "MB", "GB", "TB"];
        var i = 0;
        var v = Number(bytes);
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return v.toFixed(2) + " " + units[i];
    }

    /** Unix 时间戳 → 日期字符串 */
    function formatDate(ts) {
        if (!ts || ts <= 0) return "永久有效";
        var d = new Date(Number(ts) * 1000);
        var yy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yy + "-" + mm + "-" + dd;
    }

    /** 剩余天数文字 */
    function daysLeft(ts) {
        if (!ts || ts <= 0) return "永久";
        var now = Math.floor(Date.now() / 1000);
        var diff = Number(ts) - now;
        if (diff <= 0) return "已过期";
        return Math.ceil(diff / 86400) + " 天";
    }

    /** 解析 subscription-userinfo 字符串 */
    function parseUserInfo(str) {
        var result = {};
        (str || "").split(";").forEach(function (pair) {
            var parts = pair.trim().split("=");
            if (parts.length === 2) result[parts[0].trim()] = Number(parts[1].trim());
        });
        return result;
    }

    /** ASCII 进度条 */
    function bar(used, total, width) {
        width = width || 10;
        if (!total || total <= 0) return "░".repeat(width);
        var ratio = Math.min(used / total, 1);
        var filled = Math.round(ratio * width);
        return "▓".repeat(filled) + "░".repeat(width - filled);
    }

    /** 流量 emoji */
    function trafficEmoji(used, total) {
        if (!total || total <= 0) return "⚪";
        var r = used / total;
        if (r >= 0.9) return "🔴";
        if (r >= 0.75) return "🟡";
        return "🟢";
    }

    /** 到期 emoji */
    function expireEmoji(ts) {
        if (!ts || ts <= 0) return "♾️";
        var now = Math.floor(Date.now() / 1000);
        var diff = Number(ts) - now;
        if (diff <= 0) return "❌";
        if (diff < 86400 * 7) return "⚠️";
        return "✅";
    }

    // =========================================================
    // 读取 $argument 中配置的机场列表
    // =========================================================
    var airports = [];
    var argNames = ["airport1", "airport2", "airport3"];
    argNames.forEach(function (key) {
        var url = ($argument && $argument[key + "_url"]) ? String($argument[key + "_url"]).trim() : "";
        var name = ($argument && $argument[key + "_name"]) ? String($argument[key + "_name"]).trim() : key;

        // 如果 url 是空的，或者是未被替换的模板变量（包含 {{ ），则忽略
        if (url.length > 0 && url.indexOf("{{") === -1) {
            airports.push({ name: name, url: url });
        }
    });

    // 未配置任何机场时的提示
    if (airports.length === 0) {
        $done({
            title: "🛫 机场流量面板",
            content: "⚙️ 尚未配置订阅链接\n\n请前往：\n模块 → 机场流量面板 → 编辑模板参数\n\n填写机场名称和订阅链接后返回此面板刷新。",
            icon: "airplane",
            color: "#8E8E93"
        });
        return;
    }

    // =========================================================
    // 并发拉取每个机场的订阅头信息
    // =========================================================
    var results = new Array(airports.length);
    var pending = airports.length;

    function onAllDone() {
        // 生成面板文本
        var lines = [];

        results.forEach(function (r, idx) {
            var name = airports[idx].name;

            if (r.error) {
                lines.push("━━━ " + name + " ━━━");
                lines.push("❗ 获取失败：" + r.error);
                if (idx < results.length - 1) lines.push("");
                return;
            }

            var upload = r.upload || 0;
            var download = r.download || 0;
            var total = r.total || 0;
            var expire = r.expire || 0;
            var used = upload + download;
            var remain = Math.max(total - used, 0);
            var pct = total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";

            lines.push("━━━ " + name + " ━━━");
            lines.push(trafficEmoji(used, total) + " [" + bar(used, total, 10) + "] " + pct + "%");
            lines.push("  已用：" + formatBytes(used));
            lines.push("  剩余：" + formatBytes(remain));
            lines.push("  总量：" + formatBytes(total));
            lines.push(expireEmoji(expire) + " 到期：" + formatDate(expire) + "（余 " + daysLeft(expire) + "）");

            if (idx < results.length - 1) lines.push("");
        });

        var now = new Date();
        var hh = String(now.getHours()).padStart(2, "0");
        var mi = String(now.getMinutes()).padStart(2, "0");
        lines.push("");
        lines.push("🕐 更新于 " + hh + ":" + mi + "  点击右上角 ↻ 刷新");

        $done({
            title: "🛫 机场流量面板",
            content: lines.join("\n"),
            icon: "airplane.departure",
            color: "#5856D6"
        });
    }

    airports.forEach(function (airport, idx) {
        $httpClient.get(
            {
                url: airport.url,
                headers: {
                    "User-Agent": "Egern/2.16",
                    "Accept": "*/*"
                },
                timeout: 15
            },
            function (error, response) {
                if (error) {
                    results[idx] = { error: String(error) };
                } else {
                    // 大小写不敏感地查找 subscription-userinfo 头
                    var info = "";
                    var headers = response.headers || {};
                    Object.keys(headers).forEach(function (k) {
                        if (k.toLowerCase() === "subscription-userinfo") {
                            info = headers[k];
                        }
                    });
                    var parsed = parseUserInfo(info);
                    results[idx] = {
                        upload: parsed.upload || 0,
                        download: parsed.download || 0,
                        total: parsed.total || 0,
                        expire: parsed.expire || 0
                    };
                }

                // 所有请求完成后输出面板
                pending--;
                if (pending === 0) onAllDone();
            }
        );
    });

})();
