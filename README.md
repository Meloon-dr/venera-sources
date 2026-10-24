# 八站点 Venera 安装列表（A 方案）

**`index.json` 现在列出用户指定的全部八个网址，各有独立 JS 脚本和稳定 key。** 安装列表中的名称和描述明确区分两类：

- **可逐页阅读（HTTP 链路已测，Venera App 尚未验收）**：动漫屋、X漫画。二者搜索、详情、章节、样例图片均经真实 HTTP 验证；图片请求需带章节页 Referer，已修正。
- **仅外部入口（6 项）**：香蕉漫画、包子漫画、次元狗、漫画迷、H次元、污污漫画。它们不是伪造的漫画阅读源：在 Venera 的**源设置**中点击「打开网站」后，调用官方 `UI.launchUrl` 让用户自己在外部浏览器访问；详情也写明不支持应用内逐页阅读。不会自动打开浏览器或绕过登录、付费及站点保护。

| 名称 | 指定网址 | 模式 |
|---|---|---|
| 香蕉漫画 | https://xjdm168.com/html/?p=1536 | 仅外部入口；站内 `.data` 图片经前端渲染为 blob |
| 包子漫画 | https://baozimh.org/ | 仅外部入口；图片列表加密，章节 API 受限 |
| 动漫屋 | https://www.dm5.com/ | Venera HTTP 阅读链路已测 |
| 次元狗 | https://www.acgndog.com/category/rec-comic | 仅外部入口；PDF/epub/网盘资源 |
| 漫画迷 | https://www.manhuade.com/ | 仅外部入口；PDF/MOBI 资源 |
| X漫画 | https://www.xmanhua.com/ | Venera HTTP 阅读链路已测 |
| H次元 | https://h-ciyuan.com/ | 仅外部入口；浏览器公开图片可读，Venera 网络访问未验 |
| 污污漫画（18+） | https://www.comicbox.xyz/?ref=porndude | 仅外部入口；分块加密图片无法直接用作 Venera 图片 |

`source-capabilities.json` 给出逐项能力与原因。VeneraNext 的 JS API 文档说明 `UI.launchUrl(url)` 可从用户点击的回调打开外部网址；我们未在用户的 App 中导入本包，所以源设置按钮的实际展示仍待真机验收。脚本 `url` 字段留空，因为尚无已发布的 raw JS 更新地址；不能把网站首页误设为更新脚本。

## 安装与发布

本地文件不是远程仓库源地址。GitHub 网页上传时应先解压，把 `index.json`、`source-capabilities.json`、`README.md`、`scripts/` 放在同一仓库根目录；然后使用该仓库 **Raw `index.json`** 的 URL 导入。当前机器的 `gh` 未登录，也没有仓库 remote；**本包没有对外发布**。从本地直接粘贴相对 `fileName` 的索引可能缺少解析基址。

引用：VeneraNext 官方 [Comic Source Guide](https://raw.githubusercontent.com/CyrilPeng/venera-next/main/doc/api/comic_source.en.md) 与 Venera [JS API](https://github.com/venera-app/venera/blob/master/doc/js_api.md)。
