// import lazily if using.

import * as THREE from "three";

/**
 * @author Maxime Quiblier / https://github.com/maximeq
 * Adapted to ES6 as a class.
 *
 * This material will save world space normals in pixels, the way MeshNormalMaterial does for view space normals.
 * Use same parameters as for MeshNormalMaterial.
 *
 * You need to update the uniform viewMatrixInverse for this material to work properly.
 * If you don't want to do it by yourself, just call MeshWorldNormalMaterial.updateMeshOnBeforeRender on any mesh using this material.
 * see MeshWorldNormalMaterial.updateMeshOnBeforeRender for more details.
 */
export class MeshWorldNormalMaterial extends THREE.ShaderMaterial {
    constructor(parameters?: THREE.ShaderMaterialParameters) {
        parameters = parameters || {};
    
        parameters.uniforms = THREE.UniformsUtils.merge([
            THREE.ShaderLib.normal.uniforms,
            { viewMatrixInverse: { value: new THREE.Matrix4() } }
        ]);
        parameters.vertexShader = THREE.ShaderLib.normal.vertexShader;
        parameters.fragmentShader =
            "uniform mat4 viewMatrixInverse;" + "\n" +
            THREE.ShaderLib.normal.fragmentShader.replace(
                "gl_FragColor = ",
                "normal = normalize(mat3(viewMatrixInverse) * normal);" + "\n" +
                "gl_FragColor = "
            );
    
        super(parameters);
        this.wireframe = false;
        this.wireframeLinewidth = 1;
    
        this.fog = false;
        this.lights = false;
    }

    /**
     * Helper to update the mesh onBeforeRender function to update the vewMatrixInverse uniform.
     */
    updateMeshOnBeforeRender(mesh: THREE.Mesh) {
        let oldOnBeforeRender = mesh.onBeforeRender;
        mesh.onBeforeRender = function(renderer, scene, camera, geometry, material, group){
            oldOnBeforeRender.call(this,renderer, scene, camera, geometry, material, group);
            if(this.material instanceof MeshWorldNormalMaterial){
                this.material.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);
            }
        };
    };
};
