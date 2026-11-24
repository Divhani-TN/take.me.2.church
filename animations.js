(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Header state works even with reduced motion
  var header = document.querySelector("[data-header]");
  if (header) {
    ScrollTrigger.create({
      start: 40,
      end: "max",
      onUpdate: function (self) { header.classList.toggle("is-scrolled", self.scroll() > 40); }
    });
  }

  if (reduceMotion) return;

  
  gsap.from("body", { opacity: 0, duration: 0.5, ease: "power1.out" });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname) return;
    e.preventDefault();
    gsap.to("body", { opacity: 0, duration: 0.3, ease: "power1.in", onComplete: function () { location.href = a.href; } });
  });
 
  window.addEventListener("pageshow", function (e) { if (e.persisted) gsap.set("body", { opacity: 1 }); });

  
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: function (els) {
      els.forEach(function (el) {
        var dir = el.getAttribute("data-reveal");
        gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.8, ease: "power3.out",
                      delay: parseFloat(el.getAttribute("data-delay")) || 0 });
      });
    }
  });
  $("[data-reveal]").forEach(function (el) {
    var dir = el.getAttribute("data-reveal");
    gsap.set(el, { opacity: 0, y: dir ? 0 : 30, x: dir === "left" ? -50 : dir === "right" ? 50 : 0 });
  });

  
  var parents = [];
  $("[data-stagger]").forEach(function (el) {
    if (parents.indexOf(el.parentElement) === -1) parents.push(el.parentElement);
  });
  parents.forEach(function (parent) {
    var items = $("[data-stagger]", parent);
    gsap.set(items, { opacity: 0, y: 60, scale: 0.96 });
    ScrollTrigger.create({
      trigger: parent, start: "top 85%", once: true,
      onEnter: function () {
        gsap.to(items, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power3.out", stagger: 0.12 });
      }
    });
  });

  /* ---------- Parallax ---------- */
  $("[data-parallax]").forEach(function (el) {
    var strength = parseFloat(el.getAttribute("data-parallax")) || 0.2;
    gsap.to(el, {
      yPercent: -strength * 100, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  var hero = document.querySelector("[data-hero]");
  if (hero) {
    var tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".hero-title", { y: 24, opacity: 0, duration: 0.7 })
      .from(".hero-sub",   { y: 20, opacity: 0, duration: 0.6 }, "-=0.4")
      .from(".search",     { y: 20, opacity: 0, scale: 0.92, duration: 0.7 }, "-=0.4");

    // Gentle scrub: hero content drifts up and fades as you scroll past it
    gsap.to(hero.children, {
      y: -30, opacity: 0.2, ease: "none", stagger: 0.05,
      scrollTrigger: { trigger: hero, start: "bottom 60%", end: "bottom top", scrub: true }
    });
  }

  
  var denoms = $("[data-denom]");
  if (denoms.length) {
    gsap.set(denoms, { opacity: 0, scale: 0.6, y: 20 });
    ScrollTrigger.create({
      trigger: ".denom-grid", start: "top 85%", once: true,
      onEnter: function () {
        gsap.to(denoms, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.7)", stagger: 0.07 });
      }
    });
  }

 
  var words = $("[data-tag-word]");
  if (words.length) {
    gsap.from(words, {
      y: 40, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.25,
      scrollTrigger: { trigger: "[data-tagline]", start: "top 85%", once: true }
    });
  }

  // Recalculate once fonts/images settle
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();


