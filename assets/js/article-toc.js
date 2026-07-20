const tocLinks = [...document.querySelectorAll(".article-toc a")];
const readingLayout = document.querySelector(".reading-layout");
const sidebar = document.querySelector(".article-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
const mobileSidebarQuery = window.matchMedia("(max-width: 860px)");
const sections = tocLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const heading = id ? document.getElementById(id) : null;
    return heading ? { heading, link } : null;
  })
  .filter(Boolean);

let activeLink = null;
let updateRequested = false;

function setSidebarOpen(open, { returnFocus = false } = {}) {
  if (!readingLayout || !sidebarToggle) return;

  readingLayout.classList.toggle("sidebar-is-open", open);
  sidebarToggle.setAttribute("aria-expanded", String(open));
  sidebarToggle.setAttribute(
    "aria-label",
    open ? "关闭文章导航" : "打开文章导航"
  );

  if (mobileSidebarQuery.matches) {
    sidebar?.toggleAttribute("inert", !open);
    document.body.classList.toggle("sidebar-scroll-locked", open);
  } else {
    sidebar?.removeAttribute("inert");
    document.body.classList.remove("sidebar-scroll-locked");
  }

  if (!open && returnFocus) sidebarToggle.focus();
}

sidebarToggle?.addEventListener("click", () => {
  const isOpen = sidebarToggle.getAttribute("aria-expanded") === "true";
  setSidebarOpen(!isOpen);
});

sidebarBackdrop?.addEventListener("click", () => {
  setSidebarOpen(false, { returnFocus: true });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && readingLayout?.classList.contains("sidebar-is-open")) {
    setSidebarOpen(false, { returnFocus: true });
  }
});

mobileSidebarQuery.addEventListener("change", () => setSidebarOpen(false));
setSidebarOpen(false);

function getActivationLine() {
  return Math.min(160, window.innerHeight * 0.25);
}

function getJumpLine() {
  const rootFontSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );
  return Math.max(0, getActivationLine() - rootFontSize * 0.5);
}

function updateActiveSection() {
  updateRequested = false;
  if (sections.length === 0) return;

  const activationLine = getActivationLine();
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

for (const section of sections) {
  section.link.addEventListener("click", (event) => {
    event.preventDefault();

    const top =
      window.scrollY +
      section.heading.getBoundingClientRect().top -
      getJumpLine();
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";

    history.pushState(null, "", section.link.getAttribute("href"));
    window.scrollTo({ top, behavior });
    if (mobileSidebarQuery.matches) setSidebarOpen(false);
  });
}

window.addEventListener("scroll", requestActiveSectionUpdate, {
  passive: true
});
window.addEventListener("resize", requestActiveSectionUpdate);
updateActiveSection();
