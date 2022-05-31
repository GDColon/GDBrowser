$('body').append(`
	<div data-nosnippet id="tooSmall" class="brownbox center supercenter" style="display: none; width: 80%">
	<h1>Yikes!</h1>
	<p>Your <cg>screen</cg> isn't <ca>wide</ca> enough to <cy>display</cy> this <cg>page</cg>.<br>
	Please <cy>rotate</cy> your <cg>device</cg> <ca>horizontally</ca> or <cy>resize</cy> your <cg>window</cg> to be <ca>longer</ca>.
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

let gdps = null
let onePointNine = false

function Fetch(link) {
	return new Promise(function (res, rej) {
		fetch(link).then(resp => {
			if (!resp.ok) return rej(resp)
			gdps = resp.headers.get('gdps')
			if (gdps && gdps.startsWith('1.9/')) { onePointNine = true; gdps = gdps.slice(4) }
			resp.json().then(res)
		}).catch(rej)
	})
}

let allowEsc = true;
let popupEsc = true;

$(document).keydown(function(k) {
	if (k.keyCode == 27) { //esc
		if (!allowEsc) return
		k.preventDefault()
		if (popupEsc && $('.popup').is(":visible")) $('.popup').hide();   
		else $('#backButton').trigger('click')
	}
});

let iconData = null
let iconCanvas = null
let iconRenderer = null
let overrideLoader = false
let renderedIcons = {}

// very shitty code :) i suck at this stuff

async function renderIcons() {
	if (overrideLoader) return
	let iconsToRender = $('gdicon:not([rendered], [dontload])')
	if (iconsToRender.length < 1) return
	if (!iconData) iconData = await Fetch("../api/icons")
	if (!iconCanvas) iconCanvas = document.createElement('canvas')
	if (!iconRenderer) iconRenderer = new PIXI.Application({ view: iconCanvas, width: 300, height: 300, backgroundAlpha: 0});
	if (loader.loading) return overrideLoader = true
	buildIcon(iconsToRender, 0)
}

function buildIcon(elements, current) {
	if (current >= elements.length) return
	let currentIcon = elements.eq(current)

	let cacheID = currentIcon.attr('cacheID')
	let foundCache = renderedIcons[cacheID]
	if (foundCache) {
		finishIcon(currentIcon, foundCache.name, foundCache.data)
		return buildIcon(elements, current + 1)
	}

	let iconConfig = {
		id: +currentIcon.attr('iconID'),
		form: parseIconForm(currentIcon.attr('iconForm')),
		col1: parseIconColor(currentIcon.attr('col1')),
		col2: parseIconColor(currentIcon.attr('col2')),
		glow: currentIcon.attr('glow') == "true",
		app: iconRenderer
	}

	loadIconLayers(iconConfig.form, iconConfig.id, function(a, b, c) {
		if (c) iconConfig.new = true
		new Icon(iconConfig, function(icon) {
			let dataURL = icon.toDataURL()
			let titleStr = `${Object.values(iconData.forms).find(x => x.form == icon.form).name} ${icon.id}`
			if (cacheID) renderedIcons[cacheID] = {name: titleStr, data: dataURL}
			finishIcon(currentIcon, titleStr, dataURL)
			if (overrideLoader) {
				overrideLoader = false
				renderIcons()
			}
			else buildIcon(elements, current + 1)
		})
	})
}

function finishIcon(currentIcon, name, data) {
	currentIcon.append(`<img title="${name}" style="${currentIcon.attr("imgStyle") || ""}" src="${data}">`)
	currentIcon.attr("rendered", "true")
}

// reset scroll
while ($(this).scrollTop() != 0) {
	$(this).scrollTop(0);
} 

$(document).ready(function() {
	$(window).trigger('resize');
});

// Adds all necessary elements into the tab index (all buttons and links that aren't natively focusable)
const inaccessibleLinkSelector = "*:not(a) > img.gdButton, .leaderboardTab, .gdcheckbox, .diffDiv, .lengthDiv";

document.querySelectorAll(inaccessibleLinkSelector).forEach(elem => {
  elem.setAttribute('tabindex', 0);
})

document.getElementById('backButton')?.setAttribute('tabindex', 1); // Prioritize back button, first element to be focused

// Event listener to run a .click() function if
window.addEventListener("keydown", e => {
  if(e.key !== 'Enter') return;

  const active = document.activeElement;
  const isUnsupportedLink = active.hasAttribute('tabindex'); // Only click on links that aren't already natively supported to prevent double clicking
  if(isUnsupportedLink) active.click();
})

// stolen from stackoverflow
$.fn.isInViewport = function () {
    let elementTop = $(this).offset().top;
    let elementBottom = elementTop + $(this).outerHeight();
    let viewportTop = $(window).scrollTop();
    let viewportBottom = viewportTop + $(window).height();
    return elementBottom > viewportTop && elementTop < viewportBottom;
};