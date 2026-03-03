/**
 * Egern 机场订阅信息采集脚本 v2.1
 * 
 * 功能：拦截机场订阅链接的 HTTP 响应，解析响应头中的
 * subscription-userinfo 字段，提取流量和到期时间信息并持久化存储。
 * 
 * 响应头格式示例：
 * subscription-userinfo: upload=1073741824; download=5368709120; total=107374182400; expire=1780000000
 */

; (function () {
    "use strict";

    // =========================================================
    // 1. 从响应头中读取 subscription-userinfo
    // =========================================================
    const rawInfo = $response.headers?.["subscription-userinfo"] ||
        $response.headers?.["Subscription-Userinfo"] ||
        $response.headers?.["SUBSCRIPTION-USERINFO"] ||
        "";

    if (!rawInfo) {
        // 没有找到订阅信息头，跳过处理
        console.log("[SubStore] 未找到 subscription-userinfo 响应头，跳过存储。");
        $done({});
        return;
    }

    // =========================================================
    // 2. 解析键值对
    //    格式：upload=xxx; download=xxx; total=xxx; expire=xxx
    // =========================================================
    function parseUserInfo(str) {
        const result = {};
        str.split(";").forEach(function (pair) {
            const [key, val] = pair.trim().split("=");
            if (key && val !== undefined) {
                result[key.trim()] = Number(val.trim());
            }
        });
        return result;
    }

    const info = parseUserInfo(rawInfo);

    // =========================================================
    // 3. 获取订阅来源标识（使用请求 URL 的 host 作为 key）
    // =========================================================
    let subKey = "default";
    try {
        const url = $request?.url || "";
        const matched = url.match(/^https?:\/\/([^/]+)/);
        if (matched) subKey = matched[1];
    } catch (e) {
        console.log("[SubStore] 无法解析请求 URL:", e);
    }

    // =========================================================
    // 4. 构建要存储的数据对象
    // =========================================================
    const now = Math.floor(Date.now() / 1000); // Unix 秒时间戳
    const upload = info.upload || 0;
    const download = info.download || 0;
    const total = info.total || 0;
    const expire = info.expire || 0;
    const used = upload + download;
    const remain = Math.max(total - used, 0);

    const data = {
        key: subKey,
        upload: upload,
        download: download,
        total: total,
        used: used,
        remain: remain,
        expire: expire,
        updatedAt: now
    };

    // =========================================================
    // 5. 读取已有的订阅列表，更新或追加当前订阅，再写回
    // =========================================================
    let subList = [];
    try {
        const stored = $persistentStore.read("egern_sub_list");
        if (stored) {
            subList = JSON.parse(stored);
            if (!Array.isArray(subList)) subList = [];
        }
    } catch (e) {
        console.log("[SubStore] 读取持久化数据失败，将重新初始化:", e);
        subList = [];
    }

    // 找到同 key 的订阅并替换，或追加新条目
    const idx = subList.findIndex(function (item) { return item.key === subKey; });
    if (idx >= 0) {
        subList[idx] = data;
    } else {
        subList.push(data);
    }

    $persistentStore.write(JSON.stringify(subList), "egern_sub_list");
    console.log("[SubStore] 已保存订阅信息:", JSON.stringify(data));

    // =========================================================
    // 6. 不修改响应内容，直接放行
    // =========================================================
    $done({});
})();
