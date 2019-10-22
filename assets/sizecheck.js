document.body.insertAdjacentHTML('beforeEnd', `
	<div id="tooSmall" class="brownbox center supercenter" style="display: none; width: 80%">
	<h1>Yikes!</h1>
	<p>Your <font color="#4CDA5B">screen</font> isn't <font color="aqua">wide</font> enough to <font color="yellow">display</font> this <font color="#4CDA5B">page</font>.<br>
	Please <font color="yellow">rotate</font> your <font color="#4CDA5B">device</font> <font color="aqua">horizontally</font> or <font color="yellow">resize</font> your <font color="#4CDA5B">window</font> to be <font color="aqua">longer</font>.
	</p>
	<p style="font-size: 1.8vh">Did I color too many words? I think I colored too many words.</p>
	</div>
`)

const onResize = function () {
	if (window.innerHeight > window.innerWidth) { 
		document.querySelector('#everything').style.display = "none"; 
		document.querySelector('#tooSmall').style.display = "block"; 
	}	else { 
		document.querySelector('#everything').style.display = "block"; 
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