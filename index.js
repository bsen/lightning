const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const fs = require("fs");

class WebsiteCrawler {
  constructor() {
    this.visited = new Set();
    this.results = [];
  }

  async crawl(startUrl) {
    try {
      const response = await axios.get(startUrl);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const content = [];
        $("p, h1, h2, h3, h4, h5, h6, article, main, .content").each(
          (_, el) => {
            const text = $(el).text().trim();
            if (text.length > 50) {
              content.push(text);
            }
          }
        );

        const links = [];
        $("a[href]").each((_, el) => {
          try {
            const href = $(el).attr("href");
            const url = new URL(href, startUrl);
            if (url.protocol.startsWith("http")) {
              links.push(url.href);
            }
          } catch (error) {
            console.log(error);
          }
        });

        const icons = [];
        $('link[rel*="icon"]').each((_, el) => {
          try {
            const href = $(el).attr("href");
            const type = $(el).attr("type") || "";
            const rel = $(el).attr("rel") || "";
            const url = new URL(href, startUrl);
            icons.push({
              url: url.href,
              type: type,
              rel: rel,
            });
          } catch (error) {
            console.log(error);
          }
        });
        return {
          url: startUrl,
          title: $("title").text().trim(),
          content,
          links,
          icons,
        };
      }
    } catch (error) {
      console.error(`Error crawling ${startUrl}:`, error.message);
      return {
        url: startUrl,
        error: error.message,
      };
    }
  }
}

async function main(file, url) {
  try {
    const crawler = new WebsiteCrawler();
    const pageData = await crawler.crawl(url);

    if (pageData) {
      const text = pageData.content
        .join()
        .replace(/[\s\n\r]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const dataToAdd = { url: url, content: text };
      fs.writeFileSync(file, JSON.stringify(dataToAdd, null, 2));
      pageData.links.forEach(async (link) => {
        const linkedPageData = await crawler.crawl(link);
        if (linkedPageData) {
          const text = linkedPageData.content
            .join()
            .replace(/[\s\n\r]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          const dataToAdd = { url: link, content: text };
          fs.appendFileSync(file, ",\n\n" + JSON.stringify(dataToAdd, null, 2));
          console.log(`Data written for ${link}`);
        }
      });
    } else {
      console.log("No page data found for the link!");
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log("Crawling completed!");
  }
}

main("data.txt", "https://crypto.news/");
