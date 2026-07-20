const rootStyles = getComputedStyle(document.documentElement);
const oneMonokaiCodeColors = [
//   "--syntax-comment",
  "--syntax-yellow",
  "--syntax-purple",
//   "--syntax-default",
  "--syntax-cyan",
  "--syntax-red",
  "--syntax-blue",
  "--syntax-green",
  "--syntax-orange",
//   "--syntax-diff"
].map((property) => rootStyles.getPropertyValue(property).trim());

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
