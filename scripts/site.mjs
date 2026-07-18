function initScrollReveals() {
  const targets = [...document.querySelectorAll("[data-reveal]")];
  if (targets.length === 0) return;

  const showAll = () => targets.forEach((target) => target.classList.add("is-visible"));

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
    showAll();
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  targets.forEach((target) => observer.observe(target));
}

if (typeof document !== "undefined") initScrollReveals();
