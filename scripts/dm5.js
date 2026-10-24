// Venera-Next source for publicly accessible 动漫屋 chapters; no login/paywall bypass.
class Dm5Source extends ComicSource {
  name = "动漫屋";
  key = "dm5_comics";
  version = "0.2.2";
  minAppVersion = "1.16.0";
  url = ""; // Raw update URL is unavailable until the repository is published.
  site = "https://www.dm5.com";

  async get(path, referer) {
    const response = await Network.get(this.site + path, {
      "User-Agent": "Mozilla/5.0",
      "Referer": referer || this.site + "/",
      "Accept": "text/html,application/javascript,*/*"
    });
    if (response.status !== 200) throw new Error("动漫屋 HTTP " + response.status);
    return response.body;
  }

  imageList(script) {
    // Decode the site's Dean Edwards packer as text. Never eval remote JavaScript.
    const m = script.match(/}\('((?:\\.|[^'\\])*)',(\d+),(\d+),'((?:\\.|[^'\\])*)'\.split\('\|'\)/);
    if (!m) throw new Error("动漫屋图片格式已改变");
    const radix = Number(m[2]), count = Number(m[3]);
    const words = m[4].split("|");
    if (radix < 2 || radix > 36 || count > 1000) throw new Error("动漫屋图片格式异常");
    let plain = m[1].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    const word = n => n < radix ? n.toString(radix) : word(Math.floor(n / radix)) + (n % radix).toString(radix);
    for (let n = count - 1; n >= 0; n--) {
      if (words[n]) plain = plain.replace(new RegExp("\\b" + word(n) + "\\b", "g"), words[n]);
    }
    const base = plain.match(/var\s+pix\s*=\s*["']([^"']+)["']/);
    const paths = plain.match(/var\s+pvalue\s*=\s*(\[[^;]+?\])/);
    const suffix = plain.match(/pvalue\[i\]\s*=\s*pix\s*\+\s*pvalue\[i\]\s*\+\s*["']([^"']*)["']/);
    if (!base || !paths || !suffix || !/^https:\/\/[a-z0-9.-]+\.cdndm5\.com\//i.test(base[1])) {
      throw new Error("动漫屋图片地址结构已改变");
    }
    let names;
    try { names = JSON.parse(paths[1]); } catch (_) { throw new Error("动漫屋图片列表无效"); }
    if (!Array.isArray(names) || !names.length || names.some(x => typeof x !== "string" || !/^\/[\w.-]+\.(?:jpg|jpeg|png|webp)$/i.test(x))) {
      throw new Error("动漫屋图片列表无效");
    }
    return names.map(name => base[1] + name + suffix[1]);
  }

  search = {
    optionList: [],
    load: async (keyword, options, page) => {
      const html = await this.get("/search?title=" + encodeURIComponent(keyword) + "&language=1&page=" + page);
      const doc = new HtmlDocument(html);
      try {
        const rows = doc.querySelectorAll(".banner_detail_form, .mh-list li");
        const comics = rows.map(row => {
          const a = row.querySelector(".title a");
          const img = row.querySelector(".cover img, img.mh-cover");
          const href = a && a.attributes["href"] || "";
          return /^\/manhua-[a-z0-9-]+\/$/.test(href) ? new Comic({
            id: href, title: a.text.trim(), cover: img && img.attributes["src"] || ""
          }) : null;
        }).filter(Boolean);
        const total = html.match(/相近搜索结果（(\d+)）/);
        return { comics, maxPage: total && comics.length ? Math.max(page, Math.ceil(Number(total[1]) / comics.length)) : page };
      } finally { doc.dispose(); }
    }
  };

  comic = {
    loadInfo: async id => {
      if (!/^\/manhua-[a-z0-9-]+\/$/.test(String(id))) throw new Error("无效漫画 ID");
      const doc = new HtmlDocument(await this.get(id));
      try {
        const title = doc.querySelector(".banner_detail_form .title");
        const cover = doc.querySelector(".banner_detail_form .cover img");
        const intro = doc.querySelector(".banner_detail_form .content");
        const list = doc.querySelectorAll("#chapterlistload .detail-list-select li a");
        const chapters = {};
        list.slice().reverse().forEach(a => {
          const href = a.attributes["href"] || "";
          if (/^\/m\d+\/$/.test(href)) chapters["ep_" + href.match(/\d+/)[0]] = a.text.trim();
        });
        if (!title || !Object.keys(chapters).length) throw new Error("动漫屋详情或章节不可用（该漫画可能下架）");
        return new ComicDetails({
          title: title.text.trim().replace(/\s+\d+(?:\.\d+)?分\s*$/, ""), cover: cover && cover.attributes["src"] || "",
          description: intro && intro.text.trim() || "", tags: {}, chapters,
          url: this.site + id
        });
      } finally { doc.dispose(); }
    },
    loadEp: async (comicId, epId) => {
      const id = String(epId).match(/^ep_(\d+)$/);
      if (!id) throw new Error("无效章节 ID");
      const path = "/m" + id[1] + "/";
      const html = await this.get(path);
      const mid = html.match(/\bDM5_MID\s*=\s*(\d+)/);
      const count = html.match(/\bDM5_IMAGE_COUNT\s*=\s*(\d+)/);
      const sign = html.match(/\bDM5_VIEWSIGN\s*=\s*["']([^"']+)["']/);
      const date = html.match(/\bDM5_VIEWSIGN_DT\s*=\s*["']([^"']+)["']/);
      if (!mid || !count || !sign || !date) throw new Error("动漫屋章节参数已改变或需登录");
      const total = Number(count[1]);
      if (!Number.isInteger(total) || total < 1 || total > 300) throw new Error("动漫屋章节页数异常");
      const images = [];
      while (images.length < total) {
        const page = images.length + 1;
        const query = "cid=" + id[1] + "&page=" + page + "&key=&language=1&gtk=6&_cid=" + id[1] + "&_mid=" + mid[1]
          + "&_dt=" + encodeURIComponent(date[1]) + "&_sign=" + encodeURIComponent(sign[1]);
        const response = await this.get(path + "chapterfun.ashx?" + query, this.site + path);
        const batch = this.imageList(response);
        if (!batch.length || batch.length > total - images.length) throw new Error("动漫屋章节图片批次异常");
        images.push(...batch);
      }
      return { images };
    },
    onImageLoad: imageKey => {
      const chapter = String(imageKey).match(/[?&]cid=(\d+)/);
      return { url: imageKey, headers: { "Referer": this.site + (chapter ? "/m" + chapter[1] + "/" : "/") } };
    },
    onThumbnailLoad: imageKey => ({ url: imageKey, headers: { "Referer": this.site + "/" } })
  };
}
