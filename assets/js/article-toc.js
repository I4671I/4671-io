const tocLinks = [...document.querySelectorAll(".article-toc a")];
const readingLayout = document.querySelector(".reading-layout");
const sidebar = document.querySelector(".article-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarBackdrop = document.querySelector(".sidebar-backdrop");
const mobileSidebarQuery = window.matchMedia("(max-width: 860px)");
const tableWrappers = [...document.querySelectorAll(".table-wrapper")];
const sections = tocLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const heading = id ? document.getElementById(id) : null;
    return heading ? { heading, link } : null;
  })
  .filter(Boolean);

let activeLink = null;
let updateRequested = false;
let sidebarToggleDrag = null;
let suppressSidebarToggleClick = false;

function getToggleBounds() {
  const toggleHeight = sidebarToggle?.offsetHeight || 56;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const edgeSpace = 12;

  return {
    min: edgeSpace,
    max: Math.max(edgeSpace, viewportHeight - toggleHeight - edgeSpace)
  };
}

function setTogglePosition(top, { persist = false } = {}) {
  if (!sidebarToggle) return;

  const bounds = getToggleBounds();
  const clampedTop = Math.min(bounds.max, Math.max(bounds.min, top));
  sidebarToggle.style.setProperty("--sidebar-toggle-top", `${clampedTop}px`);

  if (persist) {
    try {
      localStorage.setItem("article-sidebar-toggle-top", String(clampedTop));
    } catch {
      // The control still works when storage is unavailable.
    }
  }
}

function initializeTogglePosition() {
  if (!sidebarToggle || !mobileSidebarQuery.matches) return;

  let savedTop = Number.NaN;
  try {
    savedTop = Number.parseFloat(
      localStorage.getItem("article-sidebar-toggle-top")
    );
  } catch {
    // Use the default position when storage is unavailable.
  }

  const defaultTop =
    (window.visualViewport?.height || window.innerHeight) / 2 -
    sidebarToggle.offsetHeight / 2;
  setTogglePosition(Number.isFinite(savedTop) ? savedTop : defaultTop);
}

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

sidebarToggle?.addEventListener("pointerdown", (event) => {
  if (!mobileSidebarQuery.matches || event.button > 0) return;

  sidebarToggleDrag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startTop: sidebarToggle.getBoundingClientRect().top,
    moved: false
  };
  sidebarToggle.setPointerCapture(event.pointerId);
});

sidebarToggle?.addEventListener("pointermove", (event) => {
  if (!sidebarToggleDrag || event.pointerId !== sidebarToggleDrag.pointerId) {
    return;
  }

  const deltaY = event.clientY - sidebarToggleDrag.startY;
  if (Math.abs(deltaY) > 4) {
    sidebarToggleDrag.moved = true;
    sidebarToggle.classList.add("is-dragging");
  }

  if (sidebarToggleDrag.moved) {
    event.preventDefault();
    setTogglePosition(sidebarToggleDrag.startTop + deltaY);
  }
});

function finishToggleDrag(event) {
  if (!sidebarToggleDrag || event.pointerId !== sidebarToggleDrag.pointerId) {
    return;
  }

  if (sidebarToggleDrag.moved) {
    suppressSidebarToggleClick = event.type === "pointerup";
    setTogglePosition(sidebarToggle.getBoundingClientRect().top, {
      persist: true
    });
  }

  sidebarToggle.classList.remove("is-dragging");
  sidebarToggleDrag = null;
}

sidebarToggle?.addEventListener("pointerup", finishToggleDrag);
sidebarToggle?.addEventListener("pointercancel", finishToggleDrag);

sidebarToggle?.addEventListener("click", (event) => {
  if (suppressSidebarToggleClick) {
    event.preventDefault();
    suppressSidebarToggleClick = false;
    return;
  }

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
initializeTogglePosition();

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

function updateTableScrollHints(wrapper) {
  const scroller = wrapper.querySelector(".table-scroll");
  const leftHint = wrapper.querySelector(".table-scroll-left");
  const rightHint = wrapper.querySelector(".table-scroll-right");
  if (!scroller || !leftHint || !rightHint) return;

  const maximumScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const edgeTolerance = 1;

  leftHint.hidden =
    maximumScroll <= edgeTolerance || scroller.scrollLeft <= edgeTolerance;
  rightHint.hidden =
    maximumScroll <= edgeTolerance ||
    scroller.scrollLeft >= maximumScroll - edgeTolerance;
}

for (const wrapper of tableWrappers) {
  const scroller = wrapper.querySelector(".table-scroll");
  const leftHint = wrapper.querySelector(".table-scroll-left");
  const rightHint = wrapper.querySelector(".table-scroll-right");
  if (!scroller || !leftHint || !rightHint) continue;

  for (const cell of wrapper.querySelectorAll(".table-cell")) {
    const characterCount = [
      ...cell.textContent.trim().replace(/\s+/g, " ")
    ].length;
    cell.classList.toggle("has-long-content", characterCount > 12);
  }

  const scrollTable = (direction) => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    scroller.scrollBy({
      left: direction * Math.max(120, scroller.clientWidth * 0.75),
      behavior: reducedMotion ? "auto" : "smooth"
    });
  };

  leftHint.addEventListener("click", () => scrollTable(-1));
  rightHint.addEventListener("click", () => scrollTable(1));
  scroller.addEventListener(
    "scroll",
    () => updateTableScrollHints(wrapper),
    { passive: true }
  );
  updateTableScrollHints(wrapper);
}

if (tableWrappers.length > 0) {
  if ("ResizeObserver" in window) {
    const tableResizeObserver = new ResizeObserver(() => {
      for (const wrapper of tableWrappers) updateTableScrollHints(wrapper);
    });
    for (const wrapper of tableWrappers) {
      tableResizeObserver.observe(wrapper);
      const table = wrapper.querySelector("table");
      if (table) tableResizeObserver.observe(table);
    }
  } else {
    window.addEventListener("resize", () => {
      for (const wrapper of tableWrappers) updateTableScrollHints(wrapper);
    });
  }

  window.addEventListener("load", () => {
    for (const wrapper of tableWrappers) updateTableScrollHints(wrapper);
  });
}
