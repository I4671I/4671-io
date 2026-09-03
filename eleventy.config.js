import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RenderPlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import katex from "katex";
import footnote from "markdown-it-footnote";
import mark from "markdown-it-mark";
import taskLists from "markdown-it-task-lists";
import texmath from "markdown-it-texmath";
import sharp from "sharp";
import { addMissingPostDates } from "./scripts/add-post-dates.js";
import accentColors from "./_data/accent-colors.json" with { type: "json" };
import site from "./_data/site.json" with { type: "json" };

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const imageRoot = path.join(projectRoot, "assets/images");
const imageDimensions = new Map();
const missingImageWarnings = new Set();
const supportedImagePattern = /\.(?:avif|gif|jpe?g|png|tiff?|webp)$/i;

const getImageFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? getImageFiles(filePath) : [filePath];
  });

const loadImageDimensions = async () => {
  imageDimensions.clear();
  missingImageWarnings.clear();

  if (!fs.existsSync(imageRoot)) {
    return;
  }

  const imageFiles = getImageFiles(imageRoot).filter((filePath) =>
    supportedImagePattern.test(filePath)
  );

  await Promise.all(
    imageFiles.map(async (filePath) => {
      try {
        const metadata = await sharp(filePath).metadata();
        const dimensions = metadata.autoOrient || metadata;

        if (dimensions.width && dimensions.height) {
          const imageUrl = `/${path
            .relative(projectRoot, filePath)
            .split(path.sep)
            .join("/")}`;
          imageDimensions.set(imageUrl, {
            width: dimensions.width,
            height: dimensions.height
          });
        }
      } catch {
        // Referenced unreadable images are reported by the Markdown renderer.
      }
    })
  );
};

const getLocalImageUrl = (source) => {
  const imageUrl = String(source || "").split(/[?#]/, 1)[0];

  if (!imageUrl.startsWith("/assets/images/")) {
    return null;
  }

  try {
    return decodeURIComponent(imageUrl);
  } catch {
    return imageUrl;
  }
};

export default function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", loadImageDimensions);
  eleventyConfig.addPlugin(RenderPlugin);
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: {
      name: "feedPosts",
      limit: 20
    },
    metadata: {
      language: "zh-CN",
      title: site.name,
      subtitle: site.description,
      base: site.url,
      author: {
        name: site.author
      }
    }
  });
  eleventyConfig.ignores.add("content/about.md");
  eleventyConfig.addGlobalData("currentYear", () => new Date().getFullYear());
  eleventyConfig.addShortcode("accentPalette", () => {
    const colors = [...accentColors];

    for (let index = colors.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [colors[index], colors[randomIndex]] = [
        colors[randomIndex],
        colors[index]
      ];
    }

    return [
      `--accent-palette: ${accentColors.join(", ")}`,
      ...colors.map(
        (color, index) => `--accent-${index + 1}: ${color}`
      )
    ].join("; ");
  });
  eleventyConfig.amendLibrary("md", (markdownLibrary) => {
    markdownLibrary.set({
      breaks: true,
      linkify: true
    });

    markdownLibrary.inline.ruler.at("strikethrough", (state, silent) => {
      const start = state.pos;
      const marker = state.src.charCodeAt(start);

      if (silent || marker !== 0x7e) {
        return false;
      }

      const scanned = state.scanDelims(start, true);
      let length = scanned.length;

      if (length < 2) {
        return false;
      }

      const previousCharacter = state.src[start - 1] || " ";
      const nextCharacter = state.src[start + scanned.length] || " ";
      const canOpen = scanned.can_open || !/\s/u.test(nextCharacter);
      const canClose = scanned.can_close || !/\s/u.test(previousCharacter);

      if (length % 2) {
        const token = state.push("text", "", 0);
        token.content = "~";
        length -= 1;
      }

      for (let index = 0; index < length; index += 2) {
        const token = state.push("text", "", 0);
        token.content = "~~";
        state.delimiters.push({
          marker,
          length: 0,
          token: state.tokens.length - 1,
          end: -1,
          open: canOpen,
          close: canClose
        });
      }

      state.pos += scanned.length;
      return true;
    });

    markdownLibrary.use(mark);
    markdownLibrary.inline.ruler.before(
      "emphasis",
      "intraword_underscore_emphasis",
      (state, silent) => {
        const marker = state.src.charCodeAt(state.pos);

        if (silent || marker !== 0x5f) {
          return false;
        }

        const scanned = state.scanDelims(state.pos, true);

        for (let index = 0; index < scanned.length; index += 1) {
          const token = state.push("text", "", 0);
          token.content = "_";
          state.delimiters.push({
            marker,
            length: scanned.length,
            token: state.tokens.length - 1,
            end: -1,
            open: scanned.can_open,
            close: scanned.can_close
          });
        }

        state.pos += scanned.length;
        return true;
      }
    );
    markdownLibrary.use(taskLists);
    markdownLibrary.core.ruler.before(
      "github-task-lists",
      "empty_task_list_items",
      (state) => {
        const sourceLines = state.src.split(/\r?\n/);

        for (let index = 2; index < state.tokens.length; index += 1) {
          const token = state.tokens[index];
          const listItem = state.tokens[index - 2];

          if (
            token.type !== "inline" ||
            listItem?.type !== "list_item_open" ||
            !/^\[[ xX]\]$/.test(token.content) ||
            !token.map ||
            !/\[[ xX]\][ \t]+$/.test(sourceLines[token.map[0]] || "")
          ) {
            continue;
          }

          // markdown-it trims trailing whitespace before task-list plugins run.
          // Restore one space only when it was present in the source so that
          // "- [ ] " renders as an empty task while "- [ ]" remains text.
          token.content += " ";
          if (token.children?.[0]?.type === "text") {
            token.children[0].content += " ";
          }
        }
      }
    );
    markdownLibrary.core.ruler.after(
      "github-task-lists",
      "spaced_list_items",
      (state) => {
        const sourceLines = state.src.split(/\r?\n/);
        const listStack = [];

        for (const token of state.tokens) {
          if (
            token.type === "bullet_list_open" ||
            token.type === "ordered_list_open"
          ) {
            listStack.push({ hasItem: false });
            continue;
          }

          if (
            token.type === "bullet_list_close" ||
            token.type === "ordered_list_close"
          ) {
            listStack.pop();
            continue;
          }

          if (token.type !== "list_item_open" || !token.map) {
            continue;
          }

          const currentList = listStack.at(-1);
          const previousLine = sourceLines[token.map[0] - 1];

          if (currentList?.hasItem && previousLine?.trim() === "") {
            token.attrJoin("class", "list-item-spaced");
          }

          if (currentList) {
            currentList.hasItem = true;
          }
        }
      }
    );
    markdownLibrary.use(footnote);

    markdownLibrary.use(texmath, {
      engine: katex,
      delimiters: ["dollars", "brackets"],
      katexOptions: {
        throwOnError: false
      }
    });

    markdownLibrary.core.ruler.after(
      "inline",
      "remove_breaks_beside_captioned_images",
      (state) => {
        const sourceLines = state.src.split(/\r?\n/);

        for (const token of state.tokens) {
          if (token.type !== "inline" || !token.children) {
            continue;
          }

          const followsBlankLine =
            token.map?.[0] > 0 &&
            sourceLines[token.map[0] - 1]?.trim() === "";

          for (let index = token.children.length - 1; index >= 0; index -= 1) {
            const child = token.children[index];

            if (child.type !== "image") {
              continue;
            }

            const widthToken = token.children[index + 1];
            const widthMatch =
              widthToken?.type === "text"
                ? widthToken.content.match(
                    /^\{width=([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%)?\}/
                  )
                : null;

            if (widthMatch) {
              const widthValue = Number(widthMatch[1]);
              const isPercentage = Boolean(widthMatch[2]);
              const maximumWidth = isPercentage ? 100 : 1;

              if (
                Number.isFinite(widthValue) &&
                widthValue >= 0 &&
                widthValue <= maximumWidth
              ) {
                child.meta = {
                  ...child.meta,
                  width: `${isPercentage ? widthValue : widthValue * 100}%`
                };
              }

              widthToken.content = widthToken.content.slice(
                widthMatch[0].length
              );

              if (!widthToken.content) {
                token.children.splice(index + 1, 1);
              }
            }

            if (index === 0 && followsBlankLine) {
              child.meta = {
                ...child.meta,
                followsBlankLine: true
              };
            }

            if (
              token.children[index + 1]?.type === "softbreak" ||
              token.children[index + 1]?.type === "hardbreak"
            ) {
              token.children.splice(index + 1, 1);
            }

            if (
              token.children[index - 1]?.type === "softbreak" ||
              token.children[index - 1]?.type === "hardbreak"
            ) {
              child.meta = {
                ...child.meta,
                followsTextWithoutBlankLine: true
              };
              token.children.splice(index - 1, 1);
              index -= 1;
            }
          }
        }
      }
    );

    const imageFallback =
      '<span class="markdown-image-fallback" aria-hidden="true"></span>';

    markdownLibrary.renderer.rules.image = (
      tokens,
      index,
      options,
      environment,
      renderer
    ) => {
      const token = tokens[index];
      const caption = renderer.renderInlineAsText(
        token.children || [],
        options,
        environment
      );
      token.attrSet("alt", "");
      const source = token.attrGet("src");
      const localImageUrl = getLocalImageUrl(source);
      const dimensions = localImageUrl
        ? imageDimensions.get(localImageUrl)
        : null;

      if (dimensions) {
        token.attrSet("width", String(dimensions.width));
        token.attrSet("height", String(dimensions.height));
      } else if (
        localImageUrl &&
        !missingImageWarnings.has(localImageUrl)
      ) {
        missingImageWarnings.add(localImageUrl);
        console.warn(
          `[images] 未找到或无法读取图片：${localImageUrl}；将使用居中的灰色正方形占位。`
        );
      }

      const image = renderer.renderToken(tokens, index, options);
      const imageClasses = ["markdown-image"];
      const imageStyles = [];

      if (typeof token.meta?.width === "string") {
        imageStyles.push(`--markdown-image-width: ${token.meta.width}`);
      }

      if (dimensions) {
        imageClasses.push("markdown-image-has-dimensions");
        imageStyles.push(
          `--markdown-image-aspect-ratio: ${dimensions.width} / ${dimensions.height}`
        );
      }

      const imageStyle = imageStyles.length
        ? ` style="${imageStyles.join("; ")}"`
        : "";

      if (token.meta?.followsTextWithoutBlankLine) {
        imageClasses.push("markdown-image-after-text");
      }

      if (token.meta?.followsBlankLine) {
        imageClasses.push("markdown-image-after-blank-line");
      }

      return (
        `<span class="${imageClasses.join(" ")}"${imageStyle}>` +
        '<span class="markdown-image-frame">' +
        imageFallback +
        image +
        "</span>" +
        (caption
          ? `<span class="markdown-image-caption">${markdownLibrary.utils.escapeHtml(caption)}</span>`
          : "") +
        "</span>"
      );
    };

    markdownLibrary.core.ruler.push("article_heading_ids", (state) => {
      let headingIndex = 0;

      for (const token of state.tokens) {
        if (token.type !== "heading_open" || !/^h[1-4]$/.test(token.tag)) {
          continue;
        }

        headingIndex += 1;
        if (!token.attrGet("id")) {
          token.attrSet("id", `section-${headingIndex}`);
        }
      }
    });

    const renderToken = (tokens, index, options, environment, renderer) =>
      renderer.renderToken(tokens, index, options);
    const tableWrapperOpen =
      '<div class="table-wrapper"><div class="table-scroll" role="region" aria-label="表格，可横向滚动" tabindex="0">';
    const tableWrapperClose =
      '<button class="table-scroll-hint table-scroll-left" type="button" aria-label="向左滚动表格" hidden>←</button><button class="table-scroll-hint table-scroll-right" type="button" aria-label="向右滚动表格" hidden>→</button></div>';

    markdownLibrary.renderer.rules.table_open = (
      tokens,
      index,
      options,
      environment,
      renderer
    ) =>
      tableWrapperOpen +
      renderToken(tokens, index, options, environment, renderer);
    markdownLibrary.renderer.rules.table_close = (
      tokens,
      index,
      options,
      environment,
      renderer
    ) =>
      renderToken(tokens, index, options, environment, renderer) +
      `</div>${tableWrapperClose}`;

    for (const cellType of ["th", "td"]) {
      markdownLibrary.renderer.rules[`${cellType}_open`] = (
        tokens,
        index,
        options,
        environment,
        renderer
      ) =>
        renderToken(tokens, index, options, environment, renderer) +
        '<div class="table-cell">';
      markdownLibrary.renderer.rules[`${cellType}_close`] = (
        tokens,
        index,
        options,
        environment,
        renderer
      ) =>
        "</div>" +
        renderToken(tokens, index, options, environment, renderer);
    }
  });

  const getArticleHeadings = (content, articleTitle = "") => {
    const headings = [];
    const headingPattern = /<h([1-4])([^>]*)>([\s\S]*?)<\/h\1>/gi;
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

    if (articleTitle) {
      headings.unshift({
        level: 1,
        id: "article-title",
        text: String(articleTitle)
      });
    }

    return headings;
  };

  const sitePath = (value) => {
    const path = String(value || "/");
    return path.startsWith("/") ? path : `/${path}`;
  };

  const assetPath = (value) => {
    const url = sitePath(value);
    const sourcePath = url.split("?", 1)[0].replace(/^\/+/, "");

    try {
      const version = crypto
        .createHash("sha256")
        .update(fs.readFileSync(sourcePath))
        .digest("hex")
        .slice(0, 12);
      return `${url}${url.includes("?") ? "&" : "?"}v=${version}`;
    } catch {
      return url;
    }
  };

  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy({
    "assets/images/favicon.ico": "favicon.ico",
    "assets/images/apple-touch-icon.png": "apple-touch-icon.png"
  });
  eleventyConfig.addPassthroughCopy({
    "node_modules/katex/dist/katex.min.css":
      "assets/vendor/katex/katex.min.css",
    "node_modules/katex/dist/fonts": "assets/vendor/katex/fonts"
  });

  eleventyConfig.on("eleventy.before", addMissingPostDates);

  const getPosts = (collectionApi) =>
    collectionApi
      .getFilteredByGlob("content/posts/**/*.md")
      .sort((a, b) => b.date - a.date);

  eleventyConfig.addCollection("posts", getPosts);
  // The feed plugin reverses this collection before rendering.
  eleventyConfig.addCollection("feedPosts", (collectionApi) =>
    [...getPosts(collectionApi)].reverse()
  );

  eleventyConfig.addCollection("tagList", (collectionApi) => {
    const tags = new Set();
    for (const item of getPosts(collectionApi)) {
      for (const tag of item.data.tags || []) {
        if (tag !== "post") tags.add(tag);
      }
    }
    return [...tags];
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

  eleventyConfig.addFilter("jsonStringify", (value) =>
    JSON.stringify(value ?? {})
  );

  eleventyConfig.addFilter("tagUrl", (tag) =>
    sitePath(`/tags/${encodeURIComponent(String(tag))}/`)
  );

  eleventyConfig.addFilter("sitePath", sitePath);
  eleventyConfig.addFilter("assetPath", assetPath);

  eleventyConfig.addFilter("articleHeadings", getArticleHeadings);

  eleventyConfig.addFilter("readingTime", (content) => {
    const text = String(content || "")
      .replace(/<eqn?\b[^>]*>[\s\S]*?<\/eqn?>/gi, " ")
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
