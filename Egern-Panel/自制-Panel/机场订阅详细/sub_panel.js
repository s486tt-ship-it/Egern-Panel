/**
 * 机场订阅详细 — Egern 2.16 流量面板 v2.2
 *
 * 功能：
 *  1. 从 $argument 读取机场配置
 *  2. 尝试使用 Clash UA 主动拉取最新流量 (2秒超时机制确保面板不白屏)
 *  3. 如果超时或网络错误，自动降级为展示本地缓存
 */

; (function () {
    "use strict";

    // =========================================================
    // 1. 基础工具函数
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

    function parseUserInfo(str) {
        var result = {};
        (str || "").split(";").forEach(function (pair) {
            var parts = pair.trim().split("=");
            if (parts.length === 2) result[parts[0].trim()] = Number(parts[1].trim());
        });
        return result;
    }

    // =========================================================
    // 2. 读取参数并提取缓存
    // =========================================================
    var argNames = ["airport1", "airport2", "airport3"];
    var airports = [];

    argNames.forEach(function (key) {
        var url = ($argument && $argument[key + "_url"]) ? String($argument[key + "_url"]).trim() : "";
        var name = ($argument && $argument[key + "_name"]) ? String($argument[key + "_name"]).trim() : key;
        if (url && url.indexOf("{{") === -1) {
            airports.push({ name: name, url: url });
        }
    });

    if (airports.length === 0) {
        $done({
            title: "🛫 机场流量面板 v2.2",
            content: "⚙️ 尚未配置订阅链接\n请前往模块的「编辑模板参数」填写。",
            icon: "airplane",
            color: "#8E8E93"
        });
        return;
    }

    var cacheMap = {};
    try {
        var stored = $persistentStore.read("egern_sub_list");
        if (stored) {
            var arr = JSON.parse(stored);
            if (Array.isArray(arr)) {
                arr.forEach(function (item) { cacheMap[item.url || item.key] = item; });
            }
        }
    } catch (e) {
        console.log("[SubPanel] 读取缓存失败:", e);
    }

    // =========================================================
    // 3. 渲染视图核心逻辑
    // =========================================================
    var isDone = false;

    function render(results, isTimeout) {
        if (isDone) return;
        isDone = true;

        var lines = [];
        results.forEach(function (r, idx) {
            var name = r.name;

            // 如果发生网络错误，尝试读取缓存 fallback
            if (r.error) {
                var fallback = cacheMap[r.url];
                if (fallback) {
                    r = fallback; // 降级到缓存数据
                    r.name = name;
                    r.isFallback = true;
                } else {
                    lines.push("━━━ " + name + " ━━━");
                    // 特殊判断 Mitce 这类不返回头部的机场
                    if (r.error === "no_header") {
                        lines.push("❗ 该机场未在响应头提供流量信息");
                    } else {
                        lines.push("❗ 获取失败或连接超时");
                    }
                    if (idx < results.length - 1) lines.push("");
                    return;
                }
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
            lines.push("  已用：" + formatBytes(used) + " / 剩余：" + formatBytes(remain));
            lines.push(expireEmoji(expire) + " 到期：" + formatDate(expire) + "（余 " + daysLeft(expire) + "）");

            if (r.isFallback) {
                lines.push("  (展示缓存数据)");
            }

            if (idx < results.length - 1) lines.push("");
        });

        var now = new Date();
        var hh = String(now.getHours()).padStart(2, "0");
        var mi = String(now.getMinutes()).padStart(2, "0");
        lines.push("");
        lines.push("🕐 " + (isTimeout ? "缓存刷新于 " : "实时刷新于 ") + hh + ":" + mi);

        $done({
            title: "🛫 机场流量面板",
            content: lines.join("\n"),
            icon: "airplane.departure",
            color: "#5856D6"
        });
    }

    // =========================================================
    // 4. 发起并发网络请求 (并注入 2 秒死亡限制)
    // =========================================================
    var fetchResults = new Array(airports.length);
    var pending = airports.length;

    var timeoutTimer = setTimeout(function () {
        // 2.5 秒后强行渲染已知的结果（部分请求可能未完成，标记为 error）
        if (isDone) return;
        airports.forEach(function (ap, i) {
            if (!fetchResults[i]) fetchResults[i] = { name: ap.name, url: ap.url, error: "timeout" };
        });
        render(fetchResults, true);
    }, 2500);

    airports.forEach(function (airport, idx) {
        // 使用 HEAD 请求并伪装 Clash UA 以绕过绝大多数机场的探测
        $httpClient.head(
            {
                url: airport.url,
                headers: { "User-Agent": "Clash/1.9.0" },
                timeout: 3
            },
            function (error, response) {
                if (error) {
                    fetchResults[idx] = { name: airport.name, url: airport.url, error: String(error) };
                } else {
                    var info = "";
                    var headers = response.headers || {};
                    Object.keys(headers).forEach(function (k) {
                        if (k.toLowerCase() === "subscription-userinfo") info = headers[k];
                    });

                    if (!info) {
                        fetchResults[idx] = { name: airport.name, url: airport.url, error: "no_header" };
                    } else {
                        var parsed = parseUserInfo(info);
                        var item = {
                            name: airport.name,
                            url: airport.url,
                            upload: parsed.upload || 0,
                            download: parsed.download || 0,
                            total: parsed.total || 0,
                            expire: parsed.expire || 0
                        };
                        fetchResults[idx] = item;

                        // 写入持久化缓存
                        cacheMap[airport.url] = item;
                        var newCacheArray = [];
                        Object.keys(cacheMap).forEach(function (k) { newCacheArray.push(cacheMap[k]); });
                        $persistentStore.write(JSON.stringify(newCacheArray), "egern_sub_list");
                    }
                }

                pending--;
                if (pending === 0 && !isDone) {
                    clearTimeout(timeoutTimer);
                    render(fetchResults, false);
                }
            }
        );
    });

})();
