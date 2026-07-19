const tocLinks = [...document.querySelectorAll(".article-toc a")];
const sections = tocLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const heading = id ? document.getElementById(id) : null;
    return heading ? { heading, link } : null;
  })
  .filter(Boolean);

let activeLink = null;
let updateRequested = false;

function updateActiveSection() {
  updateRequested = false;
  if (sections.length === 0) return;

  const activationLine = Math.min(160, window.innerHeight * 0.25);
  let currentSection = sections[0];

  for (const section of sections) {
    if (section.heading.getBoundingClientRect().top > activationLine) break;
    currentSection = section;
  }

  if (currentSection.link === activeLink) return;

  activeLink?.removeAttribute("aria-current");
  currentSection.link.setAttribute("aria-current", "location");
  activeLink = currentSection.link;
}

function requestActiveSectionUpdate() {
  if (updateRequested) return;
  updateRequested = true;
  requestAnimationFrame(updateActiveSection);
}

window.addEventListener("scroll", requestActiveSectionUpdate, {
  passive: true
});
window.addEventListener("resize", requestActiveSectionUpdate);
updateActiveSection();
