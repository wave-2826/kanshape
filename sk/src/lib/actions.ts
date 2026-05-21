export function autoSize(node: HTMLTextAreaElement, maxHeight: number = 300) {
    function resize() {
        node.style.height = "auto";

        const s = getComputedStyle(node);
        node.style.height = Math.min(node.scrollHeight, maxHeight) + "px";
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