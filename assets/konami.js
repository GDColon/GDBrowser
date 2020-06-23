var allowedKeys = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    65: 'a',
    66: 'b'
};
var kc = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
var kcPosition = 0;

document.addEventListener('keydown', function(e) {
    var key = allowedKeys[e.keyCode];
    var requiredKey = kc[kcPosition];

    // compare the key with the required key
    if (key == requiredKey) {
        kcPosition++;
        if (kcPosition == kc.length) {
            gamer();
            kcPosition = 0;
        }
} else {
    kcPosition = 0;
}
});

function gamer() {
    // remove background
    $("#everything").remove()
    $("body").append(`
        <div data-nosnippet class="brownbox center supercenter">
        <h1>You found an easter egg!</h1>
        <p>
            Uhh, congrats I guess?
            <br>
            Music made by <a href="https://www.youtube.com/channel/UCCsdJ9cURZBZ-Xupn9pG44A"><span style="color:#4CDA5B">Mudstep</span></a>
        </p>
        <img src="../assets/ok.png" width="20%;" class="gdButton center" onclick="javascript:location.reload()">
        </div>
    `)

    var audio = new Audio('../assets/sans.mp3');
    audio.play();
    audio.loop = true;
}