export function autoSize(node: HTMLTextAreaElement) {
    function resize() {
        node.style.height = "auto";
        node.style.height = node.scrollHeight + "px";
    }

    node.style.resize = "none";
    node.addEventListener("input", resize);
    resize();

    return {
        destroy() {
            node.removeEventListener("input", resize);
        }
    };
}