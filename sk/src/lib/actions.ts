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

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorPlacement = "start" | "center" | "end";
export function anchor(
    /** The node to anchor */
    node: HTMLElement,
    options: {
        /** The node to anchor to */
        element: HTMLElement,
        placement: `${AnchorSide}-${AnchorPlacement}`,
        offset: number
    }
) {
    let { element, placement, offset } = options;
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

        const { side, align } = parsePlacement(placement);

        let top = 0;
        let left = 0;

        if(side === "top") {
            top = parentRect.top + scrollY - nodeRect.height - offset;
            if(align === "start") left = parentRect.left + scrollX;
            else if(align === "center") left = parentRect.left + scrollX + (parentRect.width - nodeRect.width) / 2;
            else left = parentRect.right + scrollX - nodeRect.width;
        } else if(side === "bottom") {
            top = parentRect.bottom + scrollY + offset;
            if(align === "start") left = parentRect.left + scrollX;
            else if(align === "center") left = parentRect.left + scrollX + (parentRect.width - nodeRect.width) / 2;
            else left = parentRect.right + scrollX - nodeRect.width;
        } else if(side === "left") {
            left = parentRect.left + scrollX - nodeRect.width - offset;
            if(align === "start") top = parentRect.top + scrollY;
            else if(align === "center") top = parentRect.top + scrollY + (parentRect.height - nodeRect.height) / 2;
            else top = parentRect.bottom + scrollY - nodeRect.height;
        } else { // right
            left = parentRect.right + scrollX + offset;
            if(align === "start") top = parentRect.top + scrollY;
            else if(align === "center") top = parentRect.top + scrollY + (parentRect.height - nodeRect.height) / 2;
            else top = parentRect.bottom + scrollY - nodeRect.height;
        }

        node.style.left = Math.round(left) + "px";
        node.style.top = Math.round(top) + "px";
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