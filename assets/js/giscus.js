const container = document.querySelector("[data-giscus-container]");

if (container) {
  let themeCss = "";
  let renderedDiscussionSummary;

  const encodeTheme = (css) =>
    `data:text/css;charset=utf-8,${encodeURIComponent(css)}`;

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
    const colors = [
      "#e5c07b",
      "#c678dd",
      "#56b6c2",
      "#e06c75",
      "#61afef",
      "#98c379",
      "#d19a66"
    ];

    const pickColor = () =>
      colors[Math.floor(Math.random() * colors.length)];
    const discussionColor = pickColor();
    const commentBoxColor = pickColor();
    const lastCommentColor = pickColor();

    const commentRules = colors.map((_, index) => `
main .gsc-comment:nth-child(${colors.length}n + ${index + 1}) {
  --giscus-link-color: ${pickColor()};
}`).join("");

    const replyRules = colors.map((_, index) => `
main .gsc-reply:nth-child(${colors.length}n + ${index + 1}) {
  --giscus-link-color: ${pickColor()};
}`).join("");

    return `
main {
  --giscus-link-color: ${discussionColor};
}
${commentRules}
${replyRules}
main .gsc-comments > .gsc-comment-box {
  --giscus-link-color: ${commentBoxColor};
}
main .gsc-timeline > .gsc-comment:not(:has(~ .gsc-comment)) {
  --giscus-link-color: ${lastCommentColor};
}`;
  };

  async function loadGiscus() {
    const themeResponse = await fetch("/assets/css/giscus.css");
    if (!themeResponse.ok) {
      throw new Error(`Unable to load giscus theme: ${themeResponse.status}`);
    }

    themeCss = `${await themeResponse.text()}${createAccentRules()}`;
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
