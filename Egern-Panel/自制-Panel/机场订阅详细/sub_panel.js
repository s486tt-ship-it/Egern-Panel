/**
 * 机场订阅详细 — Egern 2.16 流量面板 v2.4
 *
 * 功能：
 *  1. 从 $argument 读取由 YAML compat_arguments 透传下来的机场配置
 *  2. 使用 Clash UA 主动探测最新流量 (2.5秒超时机制确保面板不白屏)
 *  3. 如果超时或网络错误，自动降级为展示本地持久化缓存
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
    // 2. 读取 Argument 配置并提取缓存
    // =========================================================
    var airports = [];

    if (typeof $argument === "object" && $argument !== null) {
        var argNames = ["AIRPORT1", "AIRPORT2", "AIRPORT3"];
        argNames.forEach(function (key) {
            var url = ($argument[key + "_URL"]) ? String($argument[key + "_URL"]).trim() : "";
            var name = ($argument[key + "_NAME"]) ? String($argument[key + "_NAME"]).trim() : key;

            // 当从 YAML 读取时，如果用户未填，URL可能会直接保留 "{{VAR}}" (或被赋值为空)
            if (url && url.indexOf("{{") === -1 && url.indexOf("http") === 0) {
                airports.push({ name: name, url: url });
            }
        });
    }

    // 防御性：如果没有合法的机场输入，返回友好提示而不是死机或报错
    if (airports.length === 0) {
        $done({
            title: "🛫 机场流量面板 v2.4",
            content: "⚙️ 尚未配置订阅链接\n\n请前往 Egern「模块」\n点击“机场流量面板” -> 编辑模板参数\n至少填入第一个机场的完整订阅链接。",
            icon: "airplane"
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
        // ignore parsing errors from storage
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

            // 网络错误尝试读取缓存降级
            if (r.error) {
                var fallback = cacheMap[r.url];
                if (fallback) {
                    r = fallback;
                    r.name = name;
                    r.isFallback = true;
                } else {
                    lines.push("━━━ " + name + " ━━━");
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
            icon: "airplane"
        });
    }

    // =========================================================
    // 4. 发起并发网络请求 (并注入 2.5 秒死亡限制)
    // =========================================================
    var fetchResults = new Array(airports.length);
    var pending = airports.length;

    var timeoutTimer = setTimeout(function () {
        if (isDone) return;
        airports.forEach(function (ap, i) {
            if (!fetchResults[i]) fetchResults[i] = { name: ap.name, url: ap.url, error: "timeout" };
        });
        render(fetchResults, true);
    }, 2500);

    airports.forEach(function (airport, idx) {
        // 修复：改回使用 .get 防止部分环境不支持 .head 引发 TypeError；使用较短的 timeout 与主逻辑接轨
        $httpClient.get(
            {
                url: airport.url,
                headers: { "User-Agent": "Clash/1.9.0" },
                timeout: 2
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
