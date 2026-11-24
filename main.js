
(function () {
  
  if (!window.gsap) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var title = document.querySelector(".hero-title");
  if (!title) return; // not the home page

  var heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

  
  heroTimeline.from(".hero-title", { x: -80, opacity: 0, duration: 1 });

 
  if (document.querySelector(".hero-sub")) {
    heroTimeline.from(".hero-sub", { x: -60, opacity: 0, duration: 0.8 }, "-=0.5");
  }

  
  if (document.querySelector(".search")) {
    heroTimeline.from(".search", { y: 40, opacity: 0, duration: 1.2, clearProps: "all" }, 1);
  }
})();
     