export default {
  layout: "layouts/post.njk",
  permalink: ({ page }) => {
    const articlePath = page.filePathStem.replace(
      /^\/content\/posts\//,
      ""
    );
    return `posts/${articlePath}.html`;
  }
};
