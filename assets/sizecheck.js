$('body').append(`
	<div id="tooSmall" class="brownbox center supercenter" style="display: none; width: 80%">
	<h1>Yikes!</h1>
	<p>Your <font color="#4CDA5B">screen</font> isn't <font color="aqua">wide</font> enough to <font color="yellow">display</font> this <font color="#4CDA5B">page</font>.<br>
	Please <font color="yellow">rotate</font> your <font color="#4CDA5B">device</font> <font color="aqua">horizontally</font> or <font color="yellow">resize</font> your <font color="#4CDA5B">window</font> to be <font color="aqua">longer</font>.
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

function backButton() {
	if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) window.history.back()
	else window.location.href = "../../../../../"
}

$(document).keydown(function(k) {
	if (k.keyCode == 27) { //esc
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