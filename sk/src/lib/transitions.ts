export function ease(t: number) {
    return t * t * (3 - 2 * t);
}

export function grow(node: Element, {
    duration = 100,
    f = ease
}: {
    duration?: number,
    f?: ((t: number) => number)
} = {}) {
    const style = getComputedStyle(node);
    const height = parseFloat(style.height);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const marginTop = parseFloat(style.marginTop);
    const marginBottom = parseFloat(style.marginBottom);

    return {
        duration,
        css: (t: number) => `
            overflow: hidden;
            height: ${f(t) * height}px;
            padding-top: ${f(t) * paddingTop}px;
            padding-bottom: ${f(t) * paddingBottom}px;
            margin-top: ${f(t) * marginTop}px;
            margin-bottom: ${f(t) * marginBottom}px;
        `
    };
}