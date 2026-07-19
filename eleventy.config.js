import fs from "node:fs";
import path from "node:path";

export default function (eleventyConfig) {
  const getArticleHeadings = (content) => {
    const headings = [];
    const headingPattern = /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
    let match;

    while ((match = headingPattern.exec(String(content || "")))) {
      const existingId = match[2].match(/\sid=(["'])(.*?)\1/i);
      const text = match[3]
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();

      headings.push({
        level: Number(match[1]),
        id: existingId ? existingId[2] : `section-${headings.length + 1}`,
        text
      });
    }

    return headings;
  };

  const sitePath = (value) => {
    const path = String(value || "/");
    return path.startsWith("/") ? path : `/${path}`;
  };

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({
    "assets/images/b.png": "favicon.png"
  });

  eleventyConfig.on("eleventy.before", () => {
    const postsDirectory = "content/posts";
    const markdownFiles = fs
      .readdirSync(postsDirectory, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(entry.parentPath, entry.name));
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    for (const file of markdownFiles) {
      const source = fs.readFileSync(file, "utf8");
      const frontMatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!frontMatter || /^date\s*:/m.test(frontMatter[1])) continue;

      const updatedFrontMatter = frontMatter[1].replace(
        /^(title\s*:.*)$/m,
        `$1\ndate: ${today}`
      );
      const updatedSource = source.replace(
        frontMatter[0],
        `---\n${updatedFrontMatter}\n---`
      );
      fs.writeFileSync(file, updatedSource);
      console.log(`[11ty] Added date ${today} to ${file}`);
    }
  });

  const getPosts = (collectionApi) =>
    collectionApi
      .getFilteredByGlob("content/posts/**/*.md")
      .sort((a, b) => b.date - a.date);

  eleventyConfig.addCollection("posts", getPosts);

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const tags = new Set();
    for (const item of getPosts(collectionApi)) {
      for (const tag of item.data.tags || []) {
        if (tag !== "post") tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "zh-CN"));
  });

  eleventyConfig.addFilter("htmlDateString", (date) => {
    const value = new Date(date);
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  eleventyConfig.addFilter("displayDate", (date) =>
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(new Date(date))
  );

  eleventyConfig.addFilter("year", (date) =>
    new Date(date).getUTCFullYear()
  );

  eleventyConfig.addFilter("groupByYear", (items) => {
    const groups = [];
    for (const item of items || []) {
      const year = new Date(item.date).getUTCFullYear();
      let group = groups.find((candidate) => candidate.year === year);
      if (!group) {
        group = { year, posts: [] };
        groups.push(group);
      }
      group.posts.push(item);
    }
    return groups;
  });

  eleventyConfig.addFilter("limit", (items, count) =>
    (items || []).slice(0, count)
  );

  eleventyConfig.addFilter("adjacentPost", (items, currentUrl, offset) => {
    const posts = items || [];
    const currentIndex = posts.findIndex((item) => item.url === currentUrl);
    if (currentIndex === -1) return null;
    return posts[currentIndex + Number(offset)] || null;
  });

  eleventyConfig.addFilter("padStart", (value, length, character = "0") =>
    String(value).padStart(length, character)
  );

  eleventyConfig.addFilter("tagUrl", (tag) =>
    sitePath(`/tags/${encodeURIComponent(String(tag))}/`)
  );

  eleventyConfig.addFilter("sitePath", sitePath);

  eleventyConfig.addFilter("articleHeadings", getArticleHeadings);

  eleventyConfig.addFilter("addHeadingIds", (content) => {
    const headings = getArticleHeadings(content);
    let headingIndex = 0;

    return String(content || "").replace(
      /<h([2-4])([^>]*)>([\s\S]*?)<\/h\1>/gi,
      (heading, level, attributes, innerHtml) => {
        const articleHeading = headings[headingIndex++];
        if (/\sid=(["']).*?\1/i.test(attributes)) return heading;
        return `<h${level}${attributes} id="${articleHeading.id}">${innerHtml}</h${level}>`;
      }
    );
  });

  eleventyConfig.addFilter("readingTime", (content) => {
    const text = String(content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const chineseCharacters = (text.match(/[\u3400-\u9fff]/g) || []).length;
    const latinWords = text
      .replace(/[\u3400-\u9fff]/g, " ")
      .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
    const minutes =
      chineseCharacters / 400 + (latinWords ? latinWords.length : 0) / 200;
    return Math.max(1, Math.ceil(minutes));
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
}
