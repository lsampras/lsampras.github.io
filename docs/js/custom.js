
window.addEventListener('load', (event) => {// Copy button text
    var clipboard = new ClipboardJS('.copy', {
        target: function(trigger) {
            return trigger.nextElementSibling;
        }
    });
    clipboard.on('success', function(e) {
        e.trigger.textContent = "Copied!"
        e.clearSelection();
    });
    clipboard.on('error', function(e) {
        console.log("Clipboard copying error!")
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
    });
});