$('body').append(`
	<div data-nosnippet id="tooSmall" class="brownbox center supercenter" style="display: none; width: 80%">
	<h1>Yikes!</h1>
	<p>Your <span style="color:#4CDA5B">screen</span> isn't <span style="color:aqua">wide</span> enough to <span style="color:yellow">display</span> this <span style="color:#4CDA5B">page</span>.<br>
	Please <span style="color:yellow">rotate</span> your <span style="color:#4CDA5B">device</span> <span style="color:aqua">horizontally</span> or <span style="color:yellow">resize</span> your <span style="color:#4CDA5B">window</span> to be <span style="color:aqua">longer</span>.
	</p>
	<p style="font-size: 1.8vh">Did I color too many words? I think I colored too many words.</p>
	</div>
`)


$(window).resize(function () {
	if (window.innerHeight > window.innerWidth - 75) { 
		$('#everything').hide(); 
		$('#tooSmall').show();
	}

	else { 
		$('#everything').show(); 
		$('#tooSmall').hide() 
	}
});

function saveUrl() {
        if (window.location.href.endsWith('?download')) return;
	sessionStorage.setItem('prevUrl', window.location.href);
}

function backButton() {
	if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)){
            if (window.location.href.endsWith('?download') && sessionStorage.getItem('prevUrl') === window.location.href.replace('?download', '')) window.history.go(-2);
            else window.history.back()
        }
	else window.location.href = "../../../../../"
}

let allowEsc = true;
$(document).keydown(function(k) {
	if (k.keyCode == 27) { //esc
		if (!allowEsc) return
		k.preventDefault()
		if ($('.popup').is(":visible")) $('.popup').hide();   
		else $('#backButton').trigger('click')
	}
});

while ($(this).scrollTop() != 0) {
	$(this).scrollTop(0);
} 

$(document).ready(function() {
	$(window).trigger('resize');
});
