const navbar = document.getElementById("navbar");

navbar.innerHTML = `
    <nav>
    <h2>Take me 2 Church</h2>

  <ul id="nav-links">
    <li><a href="index.html"    class="nav-link">discover</a></li>
    <li><a href="churches.html"    class="nav-link">churches</a></li>
    <li><a href="events.html" class="nav-link">Events</a></li>
    <li><a href="about.html"  class="nav-link">about</a></li>
    
</ul>

    </nav>
`;


const navLinks     = document.getElementById("nav-links");


//this code greays out the navigation buttons when the page isnt active and sets the active link based on the current page. It also ensures that the menu closes when a link is clicked or when the user scrolls back to the top.
function setActiveLink() {
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

   document.querySelectorAll(".nav-link").forEach(link => {
        const linkPage = link.getAttribute("href");
        if (linkPage === currentPage) {
            link.classList.add("active");
       }
  });
}

setActiveLink();
window.addEventListener("load", function() {
    document.body.classList.add("loaded");
});

// Fade the page out before going to a new page
document.querySelectorAll("a").forEach(function(link) {

    link.addEventListener("click", function(e) {
        const href = link.getAttribute("href");

        // This code sifts through the links on the page
        //if any of the conditions are tue the code runs normally,The fade transition only runs on links that pass all these checks, 
        if (
            !href ||                         
            href.startsWith("#") ||         
            href.startsWith("http") ||      
            href.startsWith("mailto") ||      
            href.startsWith("tel")            
        ) {
            return; // skip — let these links work normally
        }

        // this Stops the link from navigating immediately
        e.preventDefault();

        // Fadeout
        document.body.classList.add("fade-out");

        // Fadein
        setTimeout(function() {
            window.location.href = href;
        }, 400); // must match the transition time in CSS
    });

});