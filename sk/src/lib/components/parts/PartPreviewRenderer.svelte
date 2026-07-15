<script lang="ts">
    import type { TypedPartsResponse } from "$lib/data/parts";
    import { client } from "$lib/pocketbase";
    import { loadScene } from "./renderer";

    const { part }: { part: TypedPartsResponse; } = $props();
    let canvas: HTMLCanvasElement | null = $state(null);

    let fileUrl = $derived(part.preview_model ? client.files.getURL(part, part.preview_model) : null);
    
    // lazy load three.js to avoid increasing the initial bundle size
    const THREE = await import("three");
    const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

    $effect(() => {
        if(!canvas || !fileUrl) return;
        
        try {
            const scene = new THREE.Scene();
        
            const frustumSize = 1;
            const aspect = canvas.clientWidth / canvas.clientHeight;
            const camera = new THREE.OrthographicCamera(
                frustumSize * aspect / -2, frustumSize * aspect / 2,
                frustumSize / 2, frustumSize / -2,
                0.001, 1000
            );
        
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                canvas,
                alpha: true
            });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
        
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            // auto-rotate camera if reduce motion is not enabled
            controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            controls.autoRotateSpeed = 1.5;
            controls.target.set(0, 0, 0);
        
            loadScene(THREE, scene, camera, fileUrl);
            
            const resizeObserver = new ResizeObserver(() => {
                const aspect = canvas!.clientWidth / canvas!.clientHeight;
                camera.left = frustumSize * aspect / -2;
                camera.right = frustumSize * aspect / 2;
                camera.top = frustumSize / 2;
                camera.bottom = frustumSize / -2;
                camera.updateProjectionMatrix();
        
                renderer.setSize(canvas!.clientWidth, canvas!.clientHeight);
            });
            resizeObserver.observe(canvas);

            renderer.setAnimationLoop(() => {
                controls.update();
                renderer.render(scene, camera);
            });

            return () => {
                resizeObserver.disconnect();
                renderer.setAnimationLoop(null);
                renderer.dispose();
            };
        } catch(e) {
            console.error("Error loading part preview:", e);
        }
    });
</script>

{#if part.preview_model}
    <!-- {fileUrl} -->
    <canvas bind:this={canvas}></canvas>
{/if}

<style lang="scss">
canvas {
    // don't expand based on the canvas's width/height attributes, which are used for the renderer's resolution
    width: 100% !important;
    height: 100% !important;
    display: block;
}
</style>