"use strict";
function somethingSelected() {
  return typeof window.getSelection == 'function' && window.getSelection().toString() != "";
}
const remover = / |\n|\t/g; //should it be /\s/g ?
$('.dragscroll').each(function(_, el) {
  let previouslyMouseDown = false
  el.addEventListener('mousemove', function(e) {
    if (e.buttons != 1) {
      if (previouslyMouseDown) {
        el.style.removeProperty('user-select')
        el.style.removeProperty('-webkit-user-select')
        previouslyMouseDown = false;
      }
      return;
    }
    if (somethingSelected()) return
    if (!previouslyMouseDown) {
      if ([...e.target.childNodes].some(
          el => el.nodeType === Node.TEXT_NODE
          &&
          el.textContent.replace(remover, '').length
        )
      ) return

      el.style['user-select'] = 'none'
      el.style['-webkit-user-select'] = 'none'
      previouslyMouseDown = true;
    }
    //el.scrollLeft -= e.movementX
    el.scrollTop -= e.movementY;
  }, {passive: true});
});