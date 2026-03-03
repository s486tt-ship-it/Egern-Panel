#!name=机场流量面板 v2.3
#!desc=查看机场订阅流量使用、剩余流量及到期时间，支持最多 3 个自定义机场
#!author=s486tt - ship - it
#!category=Egern - Panel
#!arguments=AIRPORT1_NAME: 主力机场, AIRPORT1_URL: https://example.com/sub?token=xxx,AIRPORT2_NAME:,AIRPORT2_URL:,AIRPORT3_NAME:,AIRPORT3_URL:
#!arguments - desc ==== 基础配置 ===\nAIRPORT1_NAME: 机场1的显示别名\nAIRPORT1_URL: 机场1的完整订阅链接(必须填，否则无法查询流量) \n\n === 附加机场(可选) ===\nAIRPORT2_NAME: 机场2的显示别名(若无则留空) \nAIRPORT2_URL: 机场2的完整订阅链接(若无则留空) \n\nAIRPORT3_NAME: 机场3的显示别名(若无则留空) \nAIRPORT3_URL: 机场3的完整订阅链接(若无则留空)

    /**
     * 机场订阅详细 — Egern 2.16 流量面板 v2.3
     *
     * 功能：
     *  1. 从 #!arguments 读取机场配置 (原生支持，永不白屏)
     *  2. 使用 Clash UA 主动探测最新流量 (2秒超时机制确保面板不白屏)
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
        // 2. 读取原生 Argument 配置并提取缓存
        // =========================================================
        // 不同于之前的 YAML template，这里直接读取本 JS 被导入时用户在 UI 填的参数
        var airports = [];
        var isMissing = false;

        if (typeof $argument === "object" && $argument !== null) {
            var argNames = ["AIRPORT1", "AIRPORT2", "AIRPORT3"];
            argNames.forEach(function (key) {
                var url = ($argument[key + "_URL"]) ? String($argument[key + "_URL"]).trim() : "";
                var name = ($argument[key + "_NAME"]) ? String($argument[key + "_NAME"]).trim() : key;
                // 过滤掉没改过的默认值
                if (url && url !== "https://example.com/sub?token=xxx") {
                    airports.push({ name: name, url: url });
                }
            });
        }

        if (airports.length === 0) {
            $done({
                title: "🛫 机场流量面板 v2.3",
                content: "⚙️ 尚未配置真实订阅链接\n请长按本面板 → 编辑参数设置真实 URL。",
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
            // ignore
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
                        r = fallback;
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
            if (isDone) return;
            airports.forEach(function (ap, i) {
                if (!fetchResults[i]) fetchResults[i] = { name: ap.name, url: ap.url, error: "timeout" };
            });
            render(fetchResults, true);
        }, 2300);

        airports.forEach(function (airport, idx) {
            $httpClient.head(
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
