const container = document.querySelector("[data-giscus-container]");

if (container) {
  let themeCss = "";
  let renderedDiscussionSummary;

  const encodeTheme = (css) =>
    `data:text/css;charset=utf-8,${encodeURIComponent(css)}`;

  const getCommentTitleEntries = () => {
    let configuredTitles;

    try {
      configuredTitles = JSON.parse(container.dataset.commentTitles || "{}");
    } catch {
      console.warn("[giscus] Ignoring invalid comment title configuration.");
      return [];
    }

    if (
      !configuredTitles ||
      typeof configuredTitles !== "object" ||
      Array.isArray(configuredTitles)
    ) {
      return [];
    }

    return Object.entries(configuredTitles).flatMap(
      ([username, configuredUserTitles]) => {
        if (
          !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(
            username
          )
        ) {
          return [];
        }

        const userTitles = (
          Array.isArray(configuredUserTitles)
            ? configuredUserTitles
            : [configuredUserTitles]
        )
          .filter((title) => typeof title === "string")
          .map((title) => title.replace(/\s+/g, " ").trim())
          .filter(Boolean);

        return userTitles.length > 0 ? [{ username, userTitles }] : [];
      }
    );
  };

  const commentTitleEntries = getCommentTitleEntries();

  const frameObserver = new MutationObserver(() => {
    const iframe = container.querySelector("iframe.giscus-frame");
    if (!iframe || iframe.dataset.loadListenerAttached) return;

    iframe.dataset.loadListenerAttached = "true";
    iframe.addEventListener(
      "load",
      () => {
        iframe.classList.add("is-loaded");
        frameObserver.disconnect();
      },
      { once: true }
    );
  });

  frameObserver.observe(container, { childList: true, subtree: true });

  const createAccentRules = () => {
    const rootStyles = getComputedStyle(document.documentElement);
    const colors = [];

    for (let index = 1; ; index += 1) {
      const color = rootStyles.getPropertyValue(`--accent-${index}`).trim();
      if (!color) break;
      colors.push(color);
    }

    if (colors.length === 0) return "";

    const pickColor = () =>
      colors[Math.floor(Math.random() * colors.length)];
    const discussionColor = pickColor();
    const commentBoxColor = pickColor();
    const blockSlots = colors.length;
    const commentColors = Array.from({ length: blockSlots }, pickColor);
    const replyColors = Array.from(
      { length: blockSlots * blockSlots },
      pickColor
    );

    const commentRules = commentColors
      .map((color, commentIndex) => {
        const replyVariables = Array.from(
          { length: blockSlots },
          (_, replyIndex) =>
            `--gsc-r${replyIndex + 1}:${
              replyColors[commentIndex * blockSlots + replyIndex]
            }`
        ).join(";");

        return `main .gsc-timeline>.gsc-comment:nth-child(${blockSlots}n+${
          commentIndex + 1
        }){--giscus-link-color:${color};${replyVariables}}`;
      })
      .join("");

    const replyRules = colors
      .map(
        (_, replyIndex) =>
          `main .gsc-replies>.gsc-reply:nth-child(${blockSlots}n+${
            replyIndex + 1
          }){--giscus-link-color:var(--gsc-r${replyIndex + 1})}`
      )
      .join("");

    return `main{--giscus-link-color:${discussionColor}}${commentRules}${replyRules}main .gsc-comments>.gsc-comment-box{--giscus-link-color:${commentBoxColor}}`;
  };

  const createCommentTitleRules = () => {
    if (commentTitleEntries.length === 0) return "";

    const entries = commentTitleEntries.map(({ username, userTitles }) => {
      const profileUrl = `https://github.com/${username}`;
      const selectors = [
        `main .gsc-comment-author:has(> a.gsc-comment-author-avatar[href="${profileUrl}" i])::after`,
        `main .gsc-reply-author:has(> a[href="${profileUrl}" i])::after`
      ];

      return {
        selectors,
        content: JSON.stringify(userTitles.join(" · "))
      };
    });
    const titleSelectors = entries.flatMap((entry) => entry.selectors);
    const contentRules = entries
      .map(
        ({ selectors, content }) => `
${selectors.join(",\n")} {
  content: ${content};
}`
      )
      .join("");

    return `
${titleSelectors.join(",\n")} {
  display: inline-flex;
  align-items: center;
  align-self: center;
  margin-left: 0.4rem;
  padding: 0.05rem 0.45rem;
  color: var(--giscus-link-color);
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.4;
  white-space: nowrap;
  background: color-mix(
    in srgb,
    var(--giscus-link-color) 12%,
    transparent
  );
  border: 1px solid var(--giscus-link-color);
  border-radius: 999px;
}
${contentRules}`;
  };

  async function loadGiscus() {
    const themeResponse = await fetch(container.dataset.themeUrl);
    if (!themeResponse.ok) {
      throw new Error(`Unable to load giscus theme: ${themeResponse.status}`);
    }

    const baseThemeCss = await themeResponse.text();
    await preloadThemeFonts(baseThemeCss);
    themeCss =
      `${baseThemeCss}${createAccentRules()}${createCommentTitleRules()}`;
    const script = document.createElement("script");

    script.src = "https://giscus.app/client.js";
    script.dataset.repo = container.dataset.repo;
    script.dataset.repoId = container.dataset.repoId;
    script.dataset.category = container.dataset.category;
    script.dataset.categoryId = container.dataset.categoryId;
    script.dataset.mapping = "pathname";
    script.dataset.strict = "1";
    script.dataset.reactionsEnabled = "1";
    script.dataset.emitMetadata = "1";
    script.dataset.inputPosition = "bottom";
    script.dataset.theme = encodeTheme(themeCss);
    script.dataset.lang = "zh-CN";
    script.dataset.loading = "lazy";
    script.crossOrigin = "anonymous";
    script.async = true;

    container.append(script);
  }

  async function preloadThemeFonts(css) {
    if (typeof FontFace !== "function") return;

    const fontUrls = [...css.matchAll(/src:\s*url\("([^"]+)"\)/g)]
      .map((match) => match[1]);
    const fonts = fontUrls.map(
      (url, index) => new FontFace(
        `Giscus Theme Preload ${index + 1}`,
        `url("${url}") format("woff2")`
      )
    );

    await Promise.all(
      fonts.map((font) => font.load().catch(() => undefined))
    );
  }

  loadGiscus().catch((error) => {
    console.error("[giscus]", error);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== "https://giscus.app") return;

    const discussion = event.data?.giscus?.discussion;
    const commentCount = discussion?.totalCommentCount;
    const reactionCount = discussion?.reactionCount;
    if (!Number.isInteger(commentCount) || !Number.isInteger(reactionCount)) {
      return;
    }

    const summary = `${commentCount}:${reactionCount}`;
    if (summary === renderedDiscussionSummary) return;

    const iframe = container.querySelector("iframe.giscus-frame");
    if (!iframe?.contentWindow || !themeCss) return;

    renderedDiscussionSummary = summary;
    const countRule = `
main .gsc-reactions-count::before {
  content: "${reactionCount} 个表情";
}`;

    iframe.contentWindow.postMessage(
      {
        giscus: {
          setConfig: {
            theme: encodeTheme(`${themeCss}${countRule}`)
          }
        }
      },
      "https://giscus.app"
    );
  });
}
