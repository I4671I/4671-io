const container = document.querySelector("[data-giscus-container]");

if (container) {
  let themeCss = "";
  let renderedDiscussionSummary;

  const encodeTheme = (css) =>
    `data:text/css;charset=utf-8,${encodeURIComponent(css)}`;

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

    for (let index = colors.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [colors[index], colors[randomIndex]] = [
        colors[randomIndex],
        colors[index]
      ];
    }

    const itemRules = colors.map((color, index) => `
main .gsc-comment:nth-child(${colors.length}n + ${index + 1}),
main .gsc-reply:nth-child(${colors.length}n + ${index + 1}) {
  --giscus-link-color: ${color};
}`).join("");

    return `
main {
  --giscus-link-color: ${colors[0]};
}
${itemRules}`;
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
