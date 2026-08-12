const rootStyles = getComputedStyle(document.documentElement);
const accentColors = [];

for (let index = 1; ; index += 1) {
  const color = rootStyles.getPropertyValue(`--accent-${index}`).trim();
  if (!color) break;
  accentColors.push(color);
}

const accentTargets = document.querySelectorAll([
  "a",
  ".hero > p:first-child",
  ".section-heading > div > p",
  ".post-card > p:first-child",
  ".archive-year-group summary",
  ".sidebar-year-group summary",
  ".post-content blockquote",
  ".sidebar-toggle"
].join(","));

function pickRandomColor() {
  return accentColors[Math.floor(Math.random() * accentColors.length)];
}

if (accentColors.length > 0) {
  const articleContent = document.querySelector(".post-content");
  if (articleContent) {
    for (const highlight of articleContent.querySelectorAll("mark")) {
      highlight.style.setProperty(
        "--article-highlight-color",
        pickRandomColor()
      );
    }
  }

  for (const target of accentTargets) {
    target.style.setProperty("--special-color", pickRandomColor());
  }

  for (const wrapper of document.querySelectorAll(".table-wrapper")) {
    for (const hint of wrapper.querySelectorAll(".table-scroll-hint")) {
      hint.style.setProperty("--special-color", pickRandomColor());
    }
  }
}
