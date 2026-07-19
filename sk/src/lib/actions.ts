import { getContrastRatio, parseRgb } from "./color";
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

export function openWithLinkBehavior(href: string, event: MouseEvent) {
    event.preventDefault();
    
    if(event.metaKey || event.ctrlKey || event.button === 1) {
        window.open(href, "_blank");
        return;
    }

    nav(href);
}

export function link(node: HTMLElement, href: string) {
    function onClick(event: MouseEvent) {
        openWithLinkBehavior(href, event);
        event.stopPropagation();
    }
    function onKeyPress(event: KeyboardEvent) {
        if(event.key === "Enter" || event.key === " ") {
            openWithLinkBehavior(href, event as any);
        }
    }

    node.addEventListener("click", onClick);
    if(!(node instanceof HTMLButtonElement)) {
        // accessibility
        node.setAttribute("role", "link");
        node.setAttribute("tabindex", "0");
        node.addEventListener("keypress", onKeyPress);
    }

    return {
        update(newHref: string) {
            href = newHref;
        },
        destroy() {
            node.removeEventListener("click", onClick);
            if(!(node instanceof HTMLButtonElement)) {
                node.removeEventListener("keypress", onKeyPress);
            }
        }
    };
}

type AnchorSide = "top" | "bottom" | "left" | "right" | "vauto" | "hauto";
type AnchorPlacement = "start" | "center" | "end";
export function anchor(
    /** The node to anchor */
    node: HTMLElement,
    options: {
        /** The node to anchor to */
        element: HTMLElement,
        placement: `${AnchorSide}-${AnchorPlacement}`,
        offset: number,
        padding?: number
    }
) {
    let { element, placement, offset, padding = 5 } = options;
    let resizeObserver: ResizeObserver | null = null;

    function parsePlacement(p: string) {
        const [side = "bottom", align = "center"] = p.split("-");
        return { side: side as AnchorSide, align: align as AnchorPlacement };
    }

    function position() {
        if(!element) return;

        const parentRect = element.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset || 0;
        const scrollY = window.scrollY || window.pageYOffset || 0;

        let { side, align } = parsePlacement(placement);

        if(side === "vauto") {
            // Default to bottom unless the node doesn't fit (and it's more than 50% down the page)
            if(
                parentRect.bottom + nodeRect.height + offset > window.innerHeight - padding &&
                parentRect.top > window.innerHeight / 2
            ) {
                side = "top";
            } else {
                side = "bottom";
            }
        } else if(side === "hauto") {
            // Default to right unless the node doesn't fit (and it's more than 50% across the page)
            if(
                parentRect.right + nodeRect.width + offset > window.innerWidth - padding &&
                parentRect.left > window.innerWidth / 2
            ) {
                side = "left";
            } else {
                side = "right";
            }
        }

        let top = 0, left = 0;
        const nodeHeight = Math.min(nodeRect.height, window.innerHeight - padding * 2);
        const nodeWidth = Math.min(nodeRect.width, window.innerWidth - padding * 2);
        
        if(side === "top") {
            top = parentRect.top + scrollY - nodeHeight - offset;
            if(align === "start") left = parentRect.left + scrollX;
            else if(align === "center") left = parentRect.left + scrollX + (parentRect.width - nodeWidth) / 2;
            else left = parentRect.right + scrollX - nodeWidth;
        } else if(side === "bottom") {
            top = parentRect.bottom + scrollY + offset;
            if(align === "start") left = parentRect.left + scrollX;
            else if(align === "center") left = parentRect.left + scrollX + (parentRect.width - nodeWidth) / 2;
            else left = parentRect.right + scrollX - nodeWidth;
        } else if(side === "left") {
            left = parentRect.left + scrollX - nodeWidth - offset;
            if(align === "start") top = parentRect.top + scrollY;
            else if(align === "center") top = parentRect.top + scrollY + (parentRect.height - nodeHeight) / 2;
            else top = parentRect.bottom + scrollY - nodeHeight;
        } else { // right
            left = parentRect.right + scrollX + offset;
            if(align === "start") top = parentRect.top + scrollY;
            else if(align === "center") top = parentRect.top + scrollY + (parentRect.height - nodeHeight) / 2;
            else top = parentRect.bottom + scrollY - nodeHeight;
        }

        if(left < padding) left = padding;
        if(left + nodeWidth > window.innerWidth - padding) left = window.innerWidth - nodeWidth - padding;
        if(top < padding) top = padding;
        if(top + nodeHeight > window.innerHeight - padding) top = window.innerHeight - nodeHeight - padding;
        node.style.left = Math.round(left) + "px";
        node.style.top = Math.round(top) + "px";
        if(nodeHeight < nodeRect.height) node.style.maxHeight = nodeHeight + "px";
        if(nodeWidth < nodeRect.width) node.style.maxWidth = nodeWidth + "px";
    }

    const onScrollResize = () => requestAnimationFrame(position);

    // make sure element is positioned absolutely
    if(!node.style.position) node.style.position = "absolute";

    // observe size changes on both anchor and target
    resizeObserver = new ResizeObserver(onScrollResize);
    try {
        resizeObserver.observe(node);
        resizeObserver.observe(element);
    } catch (e) {
        // ignore if observing fails
    }

    window.addEventListener("resize", onScrollResize, { passive: true });
    window.addEventListener("scroll", onScrollResize, { passive: true });

    // initial position
    requestAnimationFrame(position);

    return {
        update(newOptions: { element: HTMLElement, placement?: string, offset?: number }) {
            element = newOptions.element || element;
            placement = (newOptions.placement as any) || placement;
            offset = typeof newOptions.offset === "number" ? newOptions.offset : offset;

            if(resizeObserver) {
                try {
                    resizeObserver.disconnect();
                    resizeObserver.observe(node);
                    resizeObserver.observe(element);
                } catch(e) {
                    // noop
                }
            }

            requestAnimationFrame(position);
        },
        destroy() {
            window.removeEventListener("resize", onScrollResize);
            window.removeEventListener("scroll", onScrollResize);
            if(resizeObserver) resizeObserver.disconnect();
        }
    };
}

/**
 * Add a background to text if it doesn't have sufficient contrast with its background.
 */
export function contrastStyle(node: HTMLElement, styleText: string) {
    function update() {
        const style = getComputedStyle(node);
        const color = style.color;
        let backgroundColor = style.backgroundColor;

        let parent = node.parentElement;
        while(!backgroundColor || backgroundColor === "rgba(0, 0, 0, 0)" || backgroundColor === "transparent") {
            if(!parent) break;
            const parentStyle = getComputedStyle(parent);
            backgroundColor = parentStyle.backgroundColor;
            parent = parent.parentElement;
        }

        if(!color || !backgroundColor) return;

        const colorRgb = parseRgb(color);
        const backgroundRgb = parseRgb(backgroundColor);

        if(!colorRgb || !backgroundRgb) return;

        const contrast = getContrastRatio(colorRgb, backgroundRgb);
        if(contrast < 4.5) {
            node.style.cssText += `;${styleText}`;
        }
    }

    update();

    return {
        update
    };
}

export function autofocus(node: HTMLElement, enabled: boolean) {
    if(enabled) node.focus();
}