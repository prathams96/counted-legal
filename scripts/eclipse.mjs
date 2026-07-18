const clamp = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function setEclipseState(element, consumed, animate = false) {
  if (!element) return;
  const safeConsumed = clamp(consumed);
  element.style.setProperty("--eclipse-consumed", safeConsumed.toString());
  element.dataset.consumed = safeConsumed.toString();

  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.classList.remove("is-animating");
    window.requestAnimationFrame(() => element.classList.add("is-animating"));
  } else {
    element.classList.remove("is-animating");
  }
}

document.querySelectorAll("[data-eclipse]").forEach((element) => {
  setEclipseState(element, element.dataset.consumed, false);
});

window.CountedEclipse = Object.freeze({ set: setEclipseState });
