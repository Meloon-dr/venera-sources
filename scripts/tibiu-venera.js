class TibiuSource extends ComicSource {
  name = "TIBIU 漫画";
  key = "tibiu_comics";
  version = "1.0.0";
  minAppVersion = "1.16.0";
  url = "https://cache.tibiu.net/";

  api = "https://cache.tibiu.net/index.php/api";
  site = "https://cache.tibiu.net";

  async requestJson(path) {
    const response = await Network.get(this.api + path, {
      "Accept": "application/json",
      "Referer": this.site + "/"
    });
    if (response.status !== 200) {
      throw new Error("TIBIU API returned HTTP " + response.status);
    }
    const payload = JSON.parse(response.body);
    if (!payload || Number(payload.code) !== 1) {
      throw new Error((payload && (payload.msg || payload.message)) || "TIBIU API returned an error");
    }
    return payload;
  }

  search = {
    optionList: [],
    load: async (keyword, options, page) => {
      const payload = await this.requestJson(
        "/data/search?key=" + encodeURIComponent(keyword) + "&page=" + page
      );
      const list = Array.isArray(payload.data) ? payload.data : [];
      const comics = list.map(item => new Comic({
        id: String(item.id),
        title: item.name || "未命名作品",
        subtitle: item.author || "",
        cover: item.pic || item.picx || "",
        description: item.text || item.content || "",
        tags: Array.isArray(item.tags) ? item.tags : []
      }));
      const declaredMaxPage = Number(
        payload.maxPage || payload.max_page || payload.pageCount || payload.pagecount || 0
      );
      return {
        comics,
        maxPage: declaredMaxPage > 0 ? declaredMaxPage : (comics.length ? 999 : page - 1)
      };
    }
  };

  comic = {
    loadInfo: async id => {
      const comicId = encodeURIComponent(String(id));
      const detailPayload = await this.requestJson("/comic/detail?id=" + comicId);
      const detail = detailPayload.data || {};
      const chapterPayload = await this.requestJson("/comic/chapter?mid=" + comicId);
      const rawChapters = Array.isArray(chapterPayload.data)
        ? chapterPayload.data
        : (Array.isArray(chapterPayload.list) ? chapterPayload.list : []);

      // TIBIU returns the catalogue in its intended reading order. Keep stable site IDs.
      const chapters = {};
      rawChapters.forEach(chapter => {
        if (chapter && chapter.id !== undefined) {
          chapters["ep_" + String(chapter.id)] = chapter.name || ("章节 " + chapter.id);
        }
      });

      const tagNames = Array.isArray(detail.tags)
        ? detail.tags.map(tag => typeof tag === "string" ? tag : tag.name).filter(Boolean)
        : [];
      const author = detail.author || detail.pic_author || detail.txt_author || "";
      const updateTime = detail.latest_chapter && detail.latest_chapter.addtime
        ? String(detail.latest_chapter.addtime).slice(0, 10)
        : undefined;

      return new ComicDetails({
        title: detail.name || "未命名作品",
        subtitle: detail.summary || "",
        cover: detail.pic || detail.picx || "",
        description: detail.content || "",
        tags: {
          author: author ? [author] : [],
          genre: tagNames
        },
        chapters: Object.keys(chapters).length ? chapters : null,
        updateTime,
        url: this.site + "/comic/" + encodeURIComponent(String(id))
      });
    },

    loadEp: async (comicId, epId) => {
      if (typeof epId !== "string" || !epId.startsWith("ep_")) {
        throw new Error("Unknown TIBIU chapter ID");
      }
      const chapterId = encodeURIComponent(epId.slice(3));
      const payload = await this.requestJson("/data/pic?cid=" + chapterId);
      const pictures = Array.isArray(payload.data) ? payload.data.slice() : [];
      if (!pictures.length) {
        throw new Error("TIBIU returned no images for this chapter");
      }

      // The endpoint currently returns images newest-first; normalize to reading order.
      pictures.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      return { images: pictures.map(item => item.img).filter(Boolean) };
    },

    onImageLoad: (imageKey, comicId, epId) => ({
      url: imageKey,
      headers: { "Referer": this.site + "/" }
    }),

    // This callback must remain synchronous according to the Venera API contract.
    onThumbnailLoad: imageKey => ({
      url: imageKey,
      headers: { "Referer": this.site + "/" }
    }),

    onClickTag: (namespace, tag) => ({
      page: "search",
      attributes: { text: tag }
    })
  };
}
