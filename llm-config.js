/* =============================================================================
  LLM 接口统一配置：所有调用大模型的地方（agent 对话页 / 计划书页 / 减重助理等）
  统一从这里读取，避免各文件各自硬编码 url / key / model。
  加载顺序：本文件必须先于页面脚本加载
      <script src="llm-config.js"></script>            （portal 根目录页）
      <script src="../llm-config.js"></script>         （一级子页）
      <script src="../../llm-config.js"></script>      （二级子页）
      <script src="../../../llm-config.js"></script>   （三级子页）
  改接口地址或密钥时只需改这一个文件。
  ============================================================================= */
(function (w) {
  "use strict";
  // 本地走 dev-server.js 的同源代理；线上（GitHub Pages 等静态托管）需要一个真正常驻
  // 的代理接口，二选一：
  //   1) Cloudflare Worker   https://llm-proxy.<你的子域名>.workers.dev
  //   2) Vercel 函数         https://<你的项目>.vercel.app/api/llm-proxy
  // 部署后把下面地址换成你实际的 URL。
  var host = (w.location && w.location.hostname) || "";
  var isLocal =
    !host ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.startsWith("192.168.");
  w.LLM_CONFIG = {
    apiUrl: isLocal
      ? "/llm-proxy"
      : "https://throbbing-leaf-eb06.1013851072.workers.dev",
    apiKey: "pulinli222666uiqo",
    model: "deepseek-v4-flash",
  };
})(window);
