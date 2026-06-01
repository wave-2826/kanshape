import { goto } from "$app/navigation";
import { nav } from "./navigation";

export function autoSize(node: HTMLTextAreaElement, _value: any = undefined, maxHeight: number = 300) {
    function resize() {
        node.style.height = "auto";
        node.style.height = Math.min(node.scrollHeight, maxHeight === 0 ? Infinity : maxHeight) + "px";
    }

    node.style.resize = "none";
    node.addEventListener("input", resize);
    
    // ensure the DOM has updated before calculating height
    requestAnimationFrame(resize);

    return {
        update() {
            requestAnimationFrame(resize);
        },
        destroy() {
            node.removeEventListener("input", resize);
        }
    };
}

export function link(node: HTMLButtonElement, href: string) {
    function onClick(event: MouseEvent) {
        event.preventDefault();
        
        if(event.metaKey || event.ctrlKey || event.button === 1) {
            window.open(href, "_blank");
            return;
        }

        nav(href);
    }

    node.addEventListener("click", onClick);

    return {
        update(newHref: string) {
            href = newHref;
        },
        destroy() {
            node.removeEventListener("click", onClick);
        }
    };
}