const rootStyles = getComputedStyle(document.documentElement);
const colorProperties = [
  "--syntax-yellow",
  "--syntax-purple",
  "--syntax-cyan",
  "--syntax-red",
  "--syntax-blue",
  "--syntax-green",
  "--syntax-orange"
];
const fallbackColors = [
  "#e5c07b",
  "#c678dd",
  "#56b6c2",
  "#e06c75",
  "#61afef",
  "#98c379",
  "#d19a66"
];
const resolvedColors = colorProperties.map((property) =>
  rootStyles.getPropertyValue(property).trim()
);
const oneMonokaiCodeColors = resolvedColors.every(Boolean)
  ? resolvedColors
  : fallbackColors;

const accentTargets = document.querySelectorAll([
  "a",
  ".hero > p:first-child",
  ".about-heading > p",
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
    colorBag = [...oneMonokaiCodeColors];

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

for (const target of accentTargets) {
  target.style.setProperty("--special-color", takeRandomColor());
}

for (const wrapper of document.querySelectorAll(".table-wrapper")) {
  const tableColor = takeRandomColor();
  for (const hint of wrapper.querySelectorAll(".table-scroll-hint")) {
    hint.style.setProperty("--special-color", tableColor);
  }
}
