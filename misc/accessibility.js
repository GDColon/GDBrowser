// Adds all necessary elements into the tab index (all buttons and links that aren't natively focusable)
document.querySelectorAll('*:not(a) > img.gdButton, .leaderboardTab, .gdcheckbox').forEach(elem => {
  elem.setAttribute('tabindex', 0)
})

document.getElementById('backButton')?.setAttribute('tabindex', 1); // Prioritize back button, first element to be focused


// Event listener to run a .click() function if
window.addEventListener("keydown", e => {
  if(e.key !== 'Enter') return;

  const active = document.activeElement;
  const isUnsupportedLink = active.hasAttribute('tabindex'); // Only click on links that aren't already natively supported to prevent double clicking
  if(isUnsupportedLink) active.click();
})