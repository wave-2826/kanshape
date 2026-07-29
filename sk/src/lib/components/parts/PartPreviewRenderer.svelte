<script lang="ts">
    import type { TypedPartsResponse } from "$lib/data/parts";
    import { client } from "$lib/pocketbase";

    const {
        part,
        stats: showStats = false,
        onload,
        edges = true
    }: {
        part: TypedPartsResponse;
        stats?: boolean,
        onload?: (info: { size: number, generated: string }) => void,
        edges?: boolean
    } = $props();
    let canvas: HTMLCanvasElement | null = $state(null);

    let fileUrl = $derived(part.preview_model ? client.files.getURL(part, part.preview_model) : null);

    let loading = $state(true);
    
    // lazy load three.js to avoid increasing the initial bundle size
    const THREE = await import("three");
    const { loadScene } = await import("./renderer");
    const { TrackballControls } = await import("./CustomTrackballControls");
    const Stats = (await import("three/examples/jsm/libs/stats.module.js")).default;

    $effect(() => {
        if(!canvas || !fileUrl) return;
        
        try {
            const scene = new THREE.Scene();
        
            const frustumSize = 1.3;
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const camera = new THREE.OrthographicCamera(
                ...(
                    aspect > 1 ? [frustumSize * aspect / -2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / -2]
                    : [frustumSize / -2, frustumSize / 2, frustumSize / aspect / 2, frustumSize / aspect / -2]
                ),
                0.001, 1000
            );

            let stats = showStats ? new Stats() : null;
            if(stats) {
                canvas.parentElement?.appendChild(stats.dom);
            }
        
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                canvas,
                alpha: true
            });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        
            const controls = new TrackballControls(camera, renderer.domElement);
            
            controls.staticMoving = false;
            controls.dynamicDampingFactor = 0.25;
            controls.rotateSpeed = 0.01;
            controls.panSpeed = 1.0;
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };
            // controls.noPan = true;
            controls.target.set(0, 0, 0);

            // // auto-rotate camera if reduce motion is not enabled
            controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            controls.autoRotateSpeed = 0.02;
        
            loading = true;
            loadScene(scene, camera, fileUrl, { edges }).then(({ info }) => {
                loading = false;
                if(onload) onload(info);
            });
            
            const resizeObserver = new ResizeObserver(() => {
                const aspect = canvas!.clientWidth / canvas!.clientHeight;
                if(aspect > 1) {
                    camera.left = frustumSize * aspect / -2;
                    camera.right = frustumSize * aspect / 2;
                    camera.top = frustumSize / 2;
                    camera.bottom = frustumSize / -2;
                } else {
                    camera.left = frustumSize / -2;
                    camera.right = frustumSize / 2;
                    camera.top = frustumSize / aspect / 2;
                    camera.bottom = frustumSize / aspect / -2;
                }
                camera.updateProjectionMatrix();
        
                renderer.setSize(canvas!.clientWidth, canvas!.clientHeight);
            });
            resizeObserver.observe(canvas);

            let lastTime = performance.now();

            const intersectionObserver = new IntersectionObserver((entries) => {
                for(const entry of entries) {
                    if(entry.target === canvas) {
                        if(entry.isIntersecting) {
                            renderer.setAnimationLoop((time) => {
                                const delta = Math.min((time - lastTime) / 1000, 0.1);
                                controls.update(delta);
                                renderer.render(scene, camera);
                                if(stats) stats.update();
                            });
                        } else {
                            renderer.setAnimationLoop(null);
                        }
                    }
                }
            }, { threshold: 0.1 });
            intersectionObserver.observe(canvas);

            return () => {
                resizeObserver.disconnect();
                intersectionObserver.disconnect();
                renderer.setAnimationLoop(null);
                renderer.dispose();
            };
        } catch(e) {
            console.error("Error loading part preview:", e);
        }
    });
</script>

<div class="part-preview-renderer">
    {#if part.preview_model}
        <canvas bind:this={canvas}></canvas>
        {#if loading}
            <p class="loading">Loading model...</p>
        {/if}
    {:else}
        <p class="loading" title="Model is currently being generated or failed to generate.">Generating model...</p>
    {/if}
</div>

<style lang="scss">
.part-preview-renderer {
    position: relative;
    width: 100%;
    height: 100%;
}
canvas {
    // don't expand based on the canvas's width/height attributes, which are used for the renderer's resolution
    width: 100% !important;
    height: 100% !important;
    display: block;
}
.loading {
    display: grid;
    place-items: center;
    position: absolute;
    inset: 0;
    font-size: var(--font-tiny);
    color: var(--text-tertiary);
    pointer-events: none;
    padding: 0.5rem;
    overflow: hidden;
}
</style>