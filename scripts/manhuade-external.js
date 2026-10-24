// External-site bookmark only. This source does not claim Venera page reading.
class ManhuadeExternalSource extends ComicSource {
  name = "漫画迷｜仅外部入口";
  key = "manhuade_external";
  version = "1.0.0";
  minAppVersion = "1.16.0";
  url = ""; // No raw script update URL until published.
  siteUrl = "https://www.manhuade.com/";
  note = "PDF/MOBI 电子书下载入口；没有已验证的逐页阅读章节。";

  explore = [{
    title: "打开外部网站",
    type: "multiPageComicList",
    load: async page => ({
      comics: page === 1 ? [new Comic({
        id: "external_site", title: this.name, cover: "",
        description: this.note
      })] : [],
      maxPage: 1
    })
  }];

  comic = {
    loadInfo: async id => {
      if (id !== "external_site") throw new Error("无效入口");
      return new ComicDetails({
        title: this.name, cover: "", tags: {}, chapters: null,
        description: this.note + " 请在源设置中点击「打开网站」；阅读或下载留在网站内。",
        url: this.siteUrl
      });
    },
    loadEp: async () => { throw new Error("仅外部入口：此站尚无 Venera 逐页图片适配器"); }
  };

  settings = {
    openWebsite: {
      title: "外部网站", type: "callback", buttonText: "打开网站",
      callback: () => UI.launchUrl(this.siteUrl)
    }
  };
}
