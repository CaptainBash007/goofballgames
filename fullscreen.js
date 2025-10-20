const fullscreenBtn = document.getElementById('fullscreen-btn');
const header = document.getElementById('header');

function getGameIframe(){
    // Prefer a direct child iframe of body (most game pages use this)
    let el = document.querySelector('body > iframe');
    if (el) return el;
    // Fallbacks: inside a known container or any iframe on the page
    el = document.querySelector('#EaglerCraft iframe') || document.querySelector('.game-frame') || document.querySelector('iframe');
    return el;
}

function requestFs(el){
    if (!el) return document.documentElement.requestFullscreen?.();
    return (
        el.requestFullscreen?.() ||
        el.webkitRequestFullscreen?.() ||
        el.mozRequestFullScreen?.() ||
        el.msRequestFullscreen?.() ||
        document.documentElement.requestFullscreen?.()
    );
}

// Toggle fullscreen on the game iframe so it truly fills the screen
fullscreenBtn?.addEventListener('click', async () => {
    try {
        if (!document.fullscreenElement) {
            // Enter fullscreen on the iframe itself
            const iframe = getGameIframe();
            if (header) header.style.display = 'none';
            await requestFs(iframe);
        } else {
            await document.exitFullscreen();
        }
    } catch(e) {
        console.warn('Fullscreen request failed:', e);
    }
});

// Restore header visibility when exiting fullscreen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        if (header) header.style.display = '';
    }
});

// Optional: auto-hide fullscreen button after a short delay in fullscreen
let hideTimeout;
function showButton() {
    if (!fullscreenBtn) return;
    fullscreenBtn.style.opacity = '1';
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
        if (document.fullscreenElement) {
            fullscreenBtn.style.opacity = '0';
        }
    }, 3000);
}
document.addEventListener('mousemove', showButton);
showButton();
