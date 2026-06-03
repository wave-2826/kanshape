// FeatureScript 2960;
// import(path : "onshape/std/common.fs", version : "2960.0");
// import(path : "onshape/std/geometry.fs", version : "2960.0");

// This expanded in scope a bit, so the docs don't fit as well anymore. sorry about that!

/**
* Robust Principal Axes Determination using Least Median of Squares (LMS)
*
* Implements the algorithm from:
*   Y.-S. Liu and K. Ramani, "Robust principal axes determination for point-based shapes using least median of squares"
*   doi:10.1016/j.cad.2008.10.012 - See https://pmc.ncbi.nlm.nih.gov/articles/PMC2710849/#S9
*
* This algorithm attempts to estimate a geometry's principal axis - which is intuitively the "direction" of a body -
* by removing outlier geometry and using regular PCA (Principal Component Analysis). PCA finds the directions along
* which a point cloud varies the most. For a long thin shape, the first PCA axis is usually the shape's dominant
* "length" direction.
* 
* Standard PCA is sensitive to outliers, so this extension follows the paper's aproach by doing the following:
*  - Extract vertex positions from the selected solid body.
*    - Currently, this just uses the part's vertices, but perhaps we could sample face points as well.
*  - Repeatedly choose small random subsets of points.
*  - Run PCA on each subset and measure how well its primary axis fits the entire point cloud.
*  - Keep the subset whose axis produces the smallest median error. (Algorithm 2 - LMS)
*  - Starting from that subset, grow a "major region" by adding nearby (Algorithm 4 - Forward search)
*    iteratively add the points that are consistent with the current axis..
*    This grows the "major region" while treating the rest as outliers.
*  - Run PCA on the resulting major region.
*  - Place a mate connector at the computed reference frame.
* 
* The resulting mate connector's X axis is the robust primary principal axis.
*/

function(tl_context is Context, queries) {
    // Tuneable constants
    const SURFACE_SAMPLES = 100; // points sampled from part faces
    const LMS_K = 4; // seed subset size (>= p+1 where p=3 for 3D PCA)
    const MAX_PTS = 150; // subsample cap for performance
    const M_STEP = 10;

    // LCG PRNG
    // Sufficient randomness for RANSAC
    // Parameters from Numerical Recipes (32-bit LCG).
    const lcgNext = function(state is number) returns number {
        return ((1664525 * state + 1013904223) % 4294967296);
    };
    const lcgFloat = function(state is number) returns number {
        // Map [0, 4294967296) → [0, 1)
        return abs(state) / 4294967296;
    };

    /** 
    * PCA via SVD of the covariance matrix
    * pts: array of dimensionless 3D Vectors (no units)
    * Returns { origin: Vector, e1: Vector, e2: Vector, e3: Vector }
    *   e1: direction of maximum variance (first principal axis)
    *   e2: direction of second-largest variance
    *   e3: cross(e1, e2), completing a right-handed frame, probably not needed but whatever
    */
    const computePCA = function(pts is array) returns map {
        const n = size(pts);

        // Centroid
        var ox = 0; var oy = 0; var oz = 0;
        for(var p in pts) { ox += p[0]; oy += p[1]; oz += p[2]; }
        ox /= n; oy /= n; oz /= n;

        // 3x3 covariance matrix (it's symmetric, so we only compute the upper triangle)
        var c00 = 0; var c01 = 0; var c02 = 0;
        /*  c01 */   var c11 = 0; var c12 = 0;
        /* would be c02, c12 */   var c22 = 0;
        for(var p in pts) {
            const dx = p[0] - ox;
            const dy = p[1] - oy;
            const dz = p[2] - oz;
            c00 += dx * dx; c01 += dx * dy; c02 += dx * dz;
            c11 += dy * dy; c12 += dy * dz;
            c22 += dz * dz;
        }

        // SVD: A = (U)(S)transpose(V) (if A is symmetric, U = V, singular values = eigenvalues)
        // Singular values in S are in descending order.
        // Column j of U is the eigenvector for S[j].
        const svd = svd(matrix([[c00, c01, c02], [c01, c11, c12], [c02, c12, c22]]));
        const U = svd.u;
        
        // Extract first two eigenvectors from columns of U
        const e1 = normalize(vector(U[0][0], U[1][0], U[2][0]));
        const e2 = normalize(vector(U[0][1], U[1][1], U[2][1]));
        const e3 = normalize(cross(e1, e2)); // right-handed frame

        return {
            "origin": vector(ox, oy, oz),
            "e1": e1, "e2": e2, "e3": e3
        };
    };

    /**
    * Returns the perpendicular distance from point p to the line through
    * the origin o in direction e. e has to be a unit vector.
    */
    const axisResidual = function(p is Vector, o is Vector, e is Vector) returns number {
        const d = p - o;
        return norm(d - dot(d, e) * e);
    };

    /**
    * Returns the median of a numeric array
    */
    const arrayMedian = function(vals is array) returns number {
        const sorted = sort(vals, function(a, b) { return a - b; });
        const n = size(sorted);
        if(n % 2 == 1) {
            return sorted[floor(n / 2)];
        } else {
            return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
        }
    };

    const addFaceSamples = function(context is Context, face is Query, count is number, pts is array) returns array {
        const grid = ceil(sqrt(count));

        var uvSamples = [];
        for(var iu = 0; iu < grid; iu += 1) {
            for(var iv = 0; iv < grid; iv += 1) {
                const u = (iu + 0.5) / grid;
                const v = (iv + 0.5) / grid;
                uvSamples = append(uvSamples, vector(u, v));
            }
        }

        const planes = evFaceTangentPlanes(context, {
            "face" : face,
            "parameters": uvSamples,
            "returnUndefinedOutsideFace": true
        });

        for(var plane in planes) {
            if(plane == undefined) continue;
            // debug(context, plane.origin, DebugColor.MAGENTA);
            pts = append(pts, plane.origin / meter);
        }

        return pts;
    };
    const collectPointCloud = function(context is Context, body is Query) returns array {
        var pts = [];

        const verts = evaluateQuery(context, qOwnedByBody(body, EntityType.VERTEX));

        for(var v in verts) {
            const point = evVertexPoint(context, { "vertex" : v });
            pts = append(pts, point / meter);
            // debug(context, point, DebugColor.CYAN);
        }

        const faces = evaluateQuery(context, qOwnedByBody(body, EntityType.FACE));

        var faceAreas = [];
        var totalArea = 0 * meter ^ 2;

        for(var face in faces) {
            const area = evArea(context, {
                "entities" : face
            });

            faceAreas = append(faceAreas, area);
            totalArea += area;
        }

        for(var i = 0; i < size(faces); i += 1) {
            const face = faces[i];
            const area = faceAreas[i];

            const nSamples = max(1, round(SURFACE_SAMPLES * area / totalArea));

            pts = addFaceSamples(context, face, nSamples, pts);
        }

        return pts;
    };

    const rpa = function(context is Context, body is Query, T is number, lambda is number) returns map {
        // First, construct the point cloud
        // For now, this is just the vertices of the shape but we should probably be sampling faces.
        var allPts = collectPointCloud(context, body);

        // Limit/subsample to MAX_PTS. Take every step-th point.
        var pts = allPts;
        const nAll = size(allPts);
        if(nAll > MAX_PTS) {
            const step = floor(nAll / MAX_PTS);
            pts = [];
            var idx = 0;
            while(idx < nAll) {
                pts = append(pts, allPts[idx]);
                idx += step;
            }
        }
        const n = size(pts);

        // LMS: find outlier-free seed subset (Algorithm 2 in the paper)
        // For T iterations:
        // - Sample LMS_K distinct random points
        // - Compute PCA to find the first axis e1
        // - Record the median of all of the residuals
        //  Keep the subset with the smallest median (which is the goal of the LMS phase, equation 5 in the paper)

        var rng = 1; // PRNG seed (any nonzero integer works)
        var rMin = 1e30;
        var bestIdxs = [0, 1, 2, 3]; // fallback to the first four points
        for(var iter = 0; iter < T; iter += 1) {
            // Sample LMS_K unique indices from [0, n)
            var subIdxs = [];
            var used = {}; // index -> true
            while(size(subIdxs) < LMS_K) {
                rng = lcgNext(rng);
                const si = floor(lcgFloat(rng) * n);
                if(used[si] == undefined) {
                    used[si] = true;
                    subIdxs = append(subIdxs, si);
                }
            }

            // PCA of the tiny subset
            var sub = [];
            for(var si in subIdxs) sub = append(sub, pts[si]);
            const pca = computePCA(sub);

            // Median residual over the remaining points (pts - subIdxs)
            var residuals = [];
            for(var p in pts) {
                if(used[p] == undefined) residuals = append(residuals, axisResidual(p, pca.origin, pca.e1));
            }

            const med = arrayMedian(residuals);
            if(med < rMin) {
                rMin = med;
                bestIdxs = subIdxs;
            }
        }

        // Forward Search: grow the major region (Algorithm 1 in the paper)
        // Starting from the LMS seed, iwe teratively add the M_STEP closest
        // remaining points as long as their residual <= rmax = lambda * rt
        // (where rt is the max residual inside the seed subset, equation 6 in the paper).
        // The final Q is the "major region"; the other points are considered outliers.

        // Boolean mask: if inMajor[i] = true, pts[i] is in Q
        var inMajor = makeArray(n, false);
        for(var bi in bestIdxs) inMajor[bi] = true;

        // Initial major region Q
        var Q = [];
        for(var i = 0; i < n; i += 1) if(inMajor[i]) {
            Q = append(Q, pts[i]);
            // debug(context, pts[i] * meter, DebugColor.GREEN);
        }

        // rmax from the initial seed
        var pca = computePCA(Q);
        var rt  = 0.0;
        for(var p in Q) {
            const r = axisResidual(p, pca.origin, pca.e1);
            if(r > rt) rt = r;
        }
        const rmax = lambda * rt;

        // Main growth loop
        var growing = true;
        while(growing) {
            // Recompute PCA on current Q (the frame shifts as Q grows)
            pca = computePCA(Q);

            // Score all non-Q points by residual to current e1 axis
            var candidates = [];
            for(var i = 0; i < n; i += 1) {
                if(!inMajor[i]) {
                    const r = axisResidual(pts[i], pca.origin, pca.e1);
                    candidates = append(candidates, { "r" : r, "i" : i });
                }
            }

            if(size(candidates) == 0) { growing = false; break; }

            // Sort candidates ascending by residual
            candidates = sort(candidates, function(a, b) { return a.r - b.r; });

            // If the best remaining point exceeds rmax, we're done
            if(candidates[0].r > rmax) {
                growing = false;
            } else {
                // Admit up to M_STEP points whose residual <= rmax
                var admitted = 0;
                for(var c in candidates) {
                    if(admitted >= M_STEP) break;
                    if(c.r > rmax) break;
                    inMajor[c.i] = true;
                    Q = append(Q, pts[c.i]);
                    // debug(context, pts[c.i] * meter, DebugColor.YELLOW);
                    admitted += 1;
                }
                if(admitted == 0) growing = false;
            }
        }

        // Finally, compute PCA on the major region
        pca = computePCA(Q);

        // Create an output mate connector where the x-axis is the principal axis
        const originPt = pca.origin * meter; // restore length units
        const cs = coordSystem(originPt, pca.e1, pca.e3);
        
        // debug(context, cs);
        
        return { "cs": cs };
    };

    /**
    * A simpler PCT-based frame on the vertices of the part. This is less robust
    * to outliers but much faster since it doesn't require the RANSAC/LMS iterations.
    */
    const pctFrame = function(context is Context, body is Query) returns map {
        const verts = evaluateQuery(context, qOwnedByBody(body, EntityType.VERTEX));

        var pts = [];
        for(var v in verts) {
            const point = evVertexPoint(context, { "vertex" : v });
            pts = append(pts, point / meter);
        }

        const pca = computePCA(pts);

        const originPt = pca.origin * meter; // restore length units
        const cs = coordSystem(originPt, pca.e1, pca.e3);

        // debug(context, cs);

        return { "cs": cs };
    };

    /**
    * Yeah, so it turns out this simple inertial frame heuristic is better than the
    * RPA algorithm in its current state. The algorithm is definitely broken in the
    * LMS phase, but I haven't been able to track down the issue yet. Hopefully I'll
    * get to it eventually, but this works for now!
    */

    const inertialFrame = function(context is Context, body is Query) returns map {
        const mp = evApproximateMassProperties(context, {
            "entities": body,
            "density": 1 * kilogram / meter ^ 3
        });

        const centroid = mp.centroid / meter;

        const I = mp.inertia / (kilogram * meter ^ 2);
        const svdResult = svd(I);

        const U = svdResult.u;

        const e1 = normalize(vector(U[0][0], U[1][0], U[2][0]));
        const e2 = normalize(vector(U[0][1], U[1][1], U[2][1]));
        const e3 = normalize(cross(e1, e2));

        const cs = coordSystem(centroid * meter, e1, e3);

        return { "cs": cs };
    };

    // annotation { "Feature Type Name" : "Robust Principal Axes" }
    // export const robustPrincipalAxes = defineFeature(function(context is Context, id is Id, definition is map)
    //     precondition {
    //         annotation {
    //             "Name": "Bodies",
    //             "Filter": EntityType.BODY && BodyType.SOLID
    //         } definition.body is Query;

    //         annotation {
    //             "Name": "RANSAC Iterations",
    //             "UIHint": UIHint.REMEMBER_PREVIOUS_VALUE,
    //             "Description": "Number of random LMS trials. Higher numbers produce a more robust initial seed."
    //         } isInteger(definition.iterations, { (unitless): [10, 200, 1000] } as IntegerBoundSpec);

    //         annotation {
    //             "Name": "Residual Band Scale lambda  [1.0 - 2.5]",
    //             "UIHint": UIHint.REMEMBER_PREVIOUS_VALUE,
    //             "Description": "Controls how far from the initial seed the major region extends. Smaller numbers make it tighter."
    //         } isReal(definition.lambda, POSITIVE_REAL_BOUNDS);
    //     }
    //     {
    //         const T = definition.iterations;
    //         const lambda = max(1.0, min(5.0, definition.lambda));

    //         for(var body in evaluateQuery(context, definition.body)) {
    //             var res = rpa(context, body, T, lambda);   
    //             opMateConnector(context, id + "_" + transientQueriesToStrings([ body ])[0] + "principalFrame", {
    //                 "coordSystem" : res.cs,
    //                 "owner"       : body
    //             });
    //         }
    //     },
    //     // default values
    //     { "iterations" : 50, "lambda" : 2.5 }
    // );

    // annotation { "Feature Type Name" : "Inertial Principal Axes" }
    // export const inertialPrincipalAxes = defineFeature(function(context is Context, id is Id, definition is map)
    //     precondition
    //     {
    //         annotation {
    //             "Name": "Bodies",
    //             "Filter": EntityType.BODY && BodyType.SOLID
    //         } definition.body is Query;
    //     }
    //     {
    //         for(var body in evaluateQuery(context, definition.body)) {
    //             const frame = inertialFrame(context, body);
        
    //             opMateConnector(context, id + "_" + transientQueriesToStrings([body])[0] + "inertialFrame", {
    //                 "coordSystem": frame.cs,
    //                 "owner" : body
    //             });
    //         }
    //     }
    // );

    const testAxisType = function(context is Context, body is Query, cs is CoordSystem) {
        // Transform the body into the inertial frame and calculate its aabb
        const bbox = evBox3d(context, {
            "topology": body,
            "cSys": cs,
            "tight": true
        });

        // Find the end faces 
        const faces = evaluateQuery(context, qOwnedByBody(body, EntityType.FACE));
        var minT = 1e30; var maxT = -1e30;
        var minFace; var maxFace;
        for(var face in faces) {
            const plane = try(evPlane(context, {
                "face": face
            }));
            if(plane == undefined) continue;
            
            const alignment = abs(dot(plane.normal, cs.xAxis));
            if(alignment < 0.9) continue; // skip faces that aren't reasonably aligned with the outlier axis

            const fb = evBox3d(context, {
                "topology": face
            });
            const center = 0.5 * (fb.minCorner + fb.maxCorner);
            const t = dot(center - cs.origin, cs.xAxis) / (bbox.maxCorner[0] - bbox.minCorner[0]);

            if(t < minT) { minT = t; minFace = face; }
            if(t > maxT) { maxT = t; maxFace = face; }
        }

        if(minFace == undefined || maxFace == undefined) return undefined;

        return {
            "minFace": minFace,
            "maxFace": maxFace,
            "certainty": maxT - minT,
            "bbox": bbox,
            "cs": cs
        };
    };

    const calculateOutlierCs = function(context is Context, bbox is Box3d, cs is CoordSystem) returns CoordSystem {
        const sx = bbox.maxCorner[0] - bbox.minCorner[0];
        const sy = bbox.maxCorner[1] - bbox.minCorner[1];
        const sz = bbox.maxCorner[2] - bbox.minCorner[2];

        // Calculate a "outlier axis" to find end faces based on; default to X if no significant outlier is found
        var outlierAxis = 0; // X
        if(sy > 1.2 * sx && sy > 1.2 * sz) {
            outlierAxis = 1; // Y
        } else if(sz > 1.2 * sx && sz > 1.2 * sy) {
            outlierAxis = 2; // Z
        }

        const yAxis = cross(cs.xAxis, cs.zAxis);
        const xAxis =
            outlierAxis == 0 ? cs.xAxis :
            (outlierAxis == 1 ? yAxis :
                            cs.zAxis);
        const zAxis = 
            outlierAxis == 0 ? yAxis :
            (outlierAxis == 1 ? cs.zAxis :
                            cs.xAxis);
        return coordSystem(cs.origin, xAxis, zAxis);
    };

    // The final 
    const runHeuristics = function(context is Context, body is Query) returns map {
        const partID = transientQueriesToStrings([ body ]);

        // Try all four of our strategies to attempt to find the principal axis and faces:
        // 1) Inertial frame
        // 2) Inertial frame + outlier axis
        // 3) RPA robust PCA
        // 4) PCT PCA
        // This is getting hacky, but it works for every part I've tried!

        const inertialFrame = inertialFrame(context, body);
        const rpaFrame = rpa(context, body, 50, 2.5);
        const pctFrame = pctFrame(context, body);

        const inertialFaces = testAxisType(context, body, inertialFrame.cs);
        const rpaFaces = testAxisType(context, body, rpaFrame.cs);
        const pctFaces = testAxisType(context, body, pctFrame.cs);

        const outlierFrame = inertialFaces != undefined ? calculateOutlierCs(context, inertialFaces.bbox, inertialFrame.cs) : undefined;
        const outlierFaces = outlierFrame != undefined ? testAxisType(context, body, outlierFrame) : undefined;

        var candidates = [ inertialFaces, outlierFaces, rpaFaces, pctFaces ];
        candidates = filter(candidates, function(c) { return c != undefined; });
        if(size(candidates) == 0) return undefined;

        // Pick the one with the widest end face separation as our best guess for the principal axis
        var best = candidates[0];
        for(var c in candidates) {
            if(c.certainty > best.certainty) best = c;
        }

        var isShaft = false;
        var isTube = false;
        var isPlate = false;
        var size = [0, 0]; // of a tube or shaft
        var thickness = 0; // of a plate
        if(best.certainty > 0.9) {
            const minFace = best.minFace;
            const maxFace = best.maxFace;
            const endFaceAreas = [ evArea(context, { "entities": minFace }), evArea(context, { "entities": maxFace }) ];

            // z faces outward, roughly along the principal axis
            const facePerpendicularCs = coordSystem(evFaceTangentPlane(context, {
                "face": minFace,
                "parameter": vector(0.5, 0.5)
            }));

            const faceDistance = best.certainty * (best.bbox.maxCorner[0] - best.bbox.minCorner[0]);
            // debug(context, minFace, DebugColor.BLUE);
            // debug(context, maxFace, DebugColor.RED);

            thickness = faceDistance;
            size = [best.bbox.maxCorner[1] - best.bbox.minCorner[1], best.bbox.maxCorner[2] - best.bbox.minCorner[2]];

            // We have a few criteria for our heuristic approach.

            // For shafts:
            // - If the AABB when rotated around the principal axis by 60deg or 45deg is roughly the same size
            //   as it was before, this is likely a shaft. This is optimized for cylinders and hex shafts/splines,
            //   of course.
            // - If the non-principal dimensions are less than 0.75", this is likely a shaft.
            // - If the end faces are circular, this is likely a shaft.
            // - If the end face areas aren't identical, this is likely not a shaft.
            const rotatedCs60 = coordSystem(
                best.cs.origin,
                best.cs.xAxis, // maintain direction
                rotationMatrix3d(best.cs.xAxis, 60 * degree) * best.cs.zAxis
            );
            const rotatedCs45 = coordSystem(
                best.cs.origin,
                best.cs.xAxis, // maintain direction
                rotationMatrix3d(best.cs.xAxis, 45 * degree) * best.cs.zAxis
            );
            const r60Box = evBox3d(context, {
                "topology": body,
                "cSys": rotatedCs60,
                "tight": true
            });
            const r45Box = evBox3d(context, {
                "topology": body,
                "cSys": rotatedCs45,
                "tight": true
            });
            const r60Size = hypot(r60Box.maxCorner[1] - r60Box.minCorner[1], r60Box.maxCorner[2] - r60Box.minCorner[2]);
            const r45Size = hypot(r45Box.maxCorner[1] - r45Box.minCorner[1], r45Box.maxCorner[2] - r45Box.minCorner[2]);
            const originalSize = hypot(best.bbox.maxCorner[1] - best.bbox.minCorner[1], best.bbox.maxCorner[2] - best.bbox.minCorner[2]);
            const dimRatio60 = r60Size / originalSize;
            const dimRatio45 = r45Size / originalSize;
            const nonPrincipalDim = max(best.bbox.maxCorner[1] - best.bbox.minCorner[1], best.bbox.maxCorner[2] - best.bbox.minCorner[2]);
            const endFaceIsCircular = canBeCircle(minFace) || canBeCircle(maxFace);
            isShaft = abs(dimRatio60 - 1) < 0.05 || abs(dimRatio45 - 1) < 0.05 || (nonPrincipalDim < 0.75 * inch) || endFaceIsCircular;
            const endFaceAreaRatio = max(endFaceAreas) / min(endFaceAreas);
            if(endFaceAreaRatio > 1.1) {
                isShaft = false;
            }

            // For tubes:
            // - If the non-princial axes are close to integer inches, this is likely a tube.
            //   This is optimized for imperial tube sizes, of course.
            // - If either end face has a smaller area than its bounding box's non-principal area,
            //   this is likely a tube.
            const principalDimInches = (best.bbox.maxCorner[0] - best.bbox.minCorner[0]) / inch;
            const sidesAreStandard = (abs(size[0] / inch - round(size[0] / inch)) < 0.1) && (abs(size[1] / inch - round(size[1] / inch)) < 0.1);
            const minFaceBbox = evBox3d(context, { "topology": minFace, "tight": true, "cSys": facePerpendicularCs });
            const maxFaceBbox = evBox3d(context, { "topology": maxFace, "tight": true, "cSys": facePerpendicularCs });
            const minFaceNonPrincipalArea = (minFaceBbox.maxCorner[0] - minFaceBbox.minCorner[0]) * (minFaceBbox.maxCorner[1] - minFaceBbox.minCorner[1]);
            const maxFaceNonPrincipalArea = (maxFaceBbox.maxCorner[0] - maxFaceBbox.minCorner[0]) * (maxFaceBbox.maxCorner[1] - maxFaceBbox.minCorner[1]);
            const smallerAreaThanBbox = (endFaceAreas[0] < 0.5 * minFaceNonPrincipalArea) || (endFaceAreas[1] < 0.5 * maxFaceNonPrincipalArea);
            
            isTube = (sidesAreStandard && principalDimInches > 0.5) || (smallerAreaThanBbox && !isShaft);

            // For plates:
            // - If the principal dimension is much shorter than the other two, this is likely a plate.
            // - If the distance between the end faces is less than 0.3 inches, this is likely a plate
            // - If the part is an active sheet metal model, this is a plate.
            const principalDim = best.bbox.maxCorner[0] - best.bbox.minCorner[0];
            isPlate = (principalDim < 0.5 * nonPrincipalDim) || (faceDistance < 0.3 * inch) || isSheetMetalModelActive(context, body);
        }

        return {
            'partID': partID,
            'name': getProperty(context, { entity: body, propertyType: PropertyType.NAME }),
            'material': getProperty(context, { entity: body, propertyType: PropertyType.MATERIAL }),
            'appearance': getProperty(context, { entity: body, propertyType: PropertyType.APPEARANCE }),
            'description': getProperty(context, { entity: body, propertyType: PropertyType.DESCRIPTION }),
            'part_number': getProperty(context, { entity: body, propertyType: PropertyType.PART_NUMBER }),
            'revision': getProperty(context, { entity: body, propertyType: PropertyType.REVISION }),
            'heuristic': {
                'partType': isShaft ? "shaft" : (isPlate ? "plate" : (isTube ? "tube" : "unknown")),
                'size': [size[0] / meter, size[1] / meter],
                'thickness': thickness / meter,
                'confidence': best.certainty
            }
        };
    };

    // // Debugging feature to visualize
    // annotation { "Feature Type Name" : "Debug Principal Axes" }
    // export const debugPrincipalAxes = defineFeature(function(context is Context, id is Id, definition is map)
    //     precondition {
    //         annotation {
    //             "Name": "Body",
    //             "Filter": EntityType.BODY && BodyType.SOLID
    //         } definition.body is Query;
    //     }
    //     {
    //         const body = evaluateQuery(context, definition.body)[0];
    //         println(runHeuristics(context, body));
    //     }
    // );

    const body = evaluateQuery(tl_context, qOwnerBody(qTransient('{{selectionID}}')))[0];
    return runHeuristics(tl_context, body);
}