export default function (eleventyConfig) {
  const sitePath = (value) => {
    const path = String(value || "/");
    return path.startsWith("/") ? path : `/${path}`;
  };

  eleventyConfig.addPassthroughCopy("assets");

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

  eleventyConfig.addFilter("padStart", (value, length, character = "0") =>
    String(value).padStart(length, character)
  );

  eleventyConfig.addFilter("tagUrl", (tag) =>
    sitePath(`/tags/${encodeURIComponent(String(tag))}/`)
  );

  eleventyConfig.addFilter("sitePath", sitePath);

  eleventyConfig.addFilter("getAllTags", (collection) => {
    const tags = new Set();
    for (const item of collection || []) {
      for (const tag of item.data.tags || []) {
        if (tag !== "post") tags.add(tag);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, "zh-CN"));
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
