document.body.insertAdjacentHTML('beforeEnd', `
	<div id="tooSmall" class="brownbox center supercenter" style="display: none; width: 80%">
	<h1>Yikes!</h1>
	<p>Your <span style="color:#4CDA5B">screen</span> isn't <span style="color:aqua">wide</span> enough to <span style="color:yellow">display</span> this <span style="color:#4CDA5B">page</span>.<br>
	Please <span style="color:yellow">rotate</span> your <span style="color:#4CDA5B">device</span> <span style="color:aqua">horizontally</span> or <span style="color:yellow">resize</span> your <span style="color:#4CDA5B">window</span> to be <span style="color:aqua">longer</span>.
	</p>
	<p style="font-size: 1.8vh">Did I color too many words? I think I colored too many words.</p>
	</div>
`)

const onResize = function () {
	if (window.innerHeight > window.innerWidth * 0.8) { 
		document.querySelector('#everything').style.display = "none"; 
		document.querySelector('#tooSmall').style.display = 'block'; 
	}	else { 
		document.querySelector('#everything').style.display = 'block'; 
		document.querySelector('#tooSmall').style.display = "none"; 
	}
};
window.addEventListener('resize', onResize, {passive: true});
onResize();

function backButton() {
	if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back()
	else window.location.href = "../../../../../"
}

document.addEventListener('keydown', function(k) {
	if (k.code == "Escape") { //esc
		k.preventDefault();
		let found = false;
		for (let el of document.querySelectorAll('.popup')) {
			if (el.style.display != "none") {
				el.style.display = "none";
				found = true;
				break;
			};
		}   
		if (!found) document.querySelector('#backButton').click();
	}
});

document.body.scrollTop = 0;