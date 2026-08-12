const rootStyles = getComputedStyle(document.documentElement);
const accentColors = rootStyles
  .getPropertyValue("--accent-palette")
  .split(",")
  .map((color) => color.trim())
  .filter(Boolean);

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

let colorBag = [];

function takeRandomColor() {
  if (colorBag.length === 0) {
    colorBag = [...accentColors];

    for (let index = colorBag.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [colorBag[index], colorBag[randomIndex]] = [
        colorBag[randomIndex],
        colorBag[index]
      ];
    }
  }

  return colorBag.pop();
}

function pickIndependentRandomColor() {
  return accentColors[Math.floor(Math.random() * accentColors.length)];
}

if (accentColors.length > 0) {
  const articleContent = document.querySelector(".post-content");
  if (articleContent) {
    for (const highlight of articleContent.querySelectorAll("mark")) {
      highlight.style.setProperty(
        "--article-highlight-color",
        pickIndependentRandomColor()
      );
    }
  }

  for (const target of accentTargets) {
    target.style.setProperty("--special-color", takeRandomColor());
  }

  for (const wrapper of document.querySelectorAll(".table-wrapper")) {
    const tableColor = takeRandomColor();
    for (const hint of wrapper.querySelectorAll(".table-scroll-hint")) {
      hint.style.setProperty("--special-color", tableColor);
    }
  }
}
