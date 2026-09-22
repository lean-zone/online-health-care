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
  w.LLM_CONFIG = {
    apiUrl: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey:
      "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",
    model: "deepseek-v4-flash",
  };
})(window);
