// FeatureScript 2960;
// import(path : "onshape/std/common.fs", version : "2960.0");
// import(path : "onshape/std/geometry.fs", version : "2960.0");

function(tl_context is Context, queries) {
    const MIN_PLANAR_AREA_FRACTION = 0.03;
    const ANGLE_ALIGN_COS = 0.9; // tolerance for faces at the end of an axis
    const CYL_AXIS_PARALLEL_COS = 0.996; // tolerance for grouping collinear cylindrical faces
    const END_GROUP_T_TOL = 0.01; // faces within this percent of axis span are the "same" end

    const PLATE_MIN_COMBINED_AREA_FRAC = 0.55;
    const PLATE_MAX_THICKNESS_RATIO = 0.4;
    const PLATE_MIN_SCORE = 0.5;

    const ELONGATION_MIN_RATIO = 1.2;
    const END_FACE_MIN_CERTAINTY = 0.85;
    const MIN_CLASSIFICATION_CONFIDENCE = 0.4;

    const FILL_RATIO_SHAFT_MIN = 0.85;
    const FILL_RATIO_TUBE_MIN = 0.12;

    const SYMMETRY_ANGLE_BINS = 36; // 10 deg bins
    const SYMMETRY_ORDERS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 24];
    const SYMMETRY_MIN_SCORE = 0.75;

    // -- generic helpers

    const arbitraryPerpendicular = function(v is Vector) returns Vector {
        const helper = abs(v[2]) < 0.9 ? vector(0, 0, 1) : vector(1, 0, 0);
        return normalize(cross(v, helper));
    };

    const concatArrays = function(a is array, b is array) returns array {
        var out = a;
        for(var x in b) out = append(out, x);
        return out;
    };

    const cross2 = function(o is array, a is array, b is array) returns number {
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    };

    // -- 2D convex hull

    const convexHull2D = function(pts is array) returns array {
        // We use the monotone chain algorithm.
        // See https://en.wikibooks.org/wiki/Algorithm_Implementation/Geometry/Convex_hull/Monotone_chain#JavaScript

        if(size(pts) <= 3) return pts;

        // sort lexiographically, so x first then y
        var sorted = sort(pts, function(a, b) {
            if(abs(a[0] - b[0]) > 1e-9) return a[0] - b[0];
            return a[1] - b[1];
        });

        var lower = [];
        for(var p in sorted) {
            while(size(lower) >= 2 && cross2(lower[size(lower) - 2], lower[size(lower) - 1], p) <= 0) {
                lower = subArray(lower, 0, size(lower) - 1);
            }
            lower = append(lower, p);
        }

        var upper = [];
        for(var i = size(sorted) - 1; i >= 0; i -= 1) {
            const p = sorted[i];
            while(size(upper) >= 2 && cross2(upper[size(upper) - 2], upper[size(upper) - 1], p) <= 0) {
                upper = subArray(upper, 0, size(upper) - 1);
            }
            upper = append(upper, p);
        }

        lower = subArray(lower, 0, size(lower) - 1);
        upper = subArray(upper, 0, size(upper) - 1);
        return concatArrays(lower, upper);
    };

    const polygonArea = function(poly is array) returns number {
        const n = size(poly);
        if(n < 3) return 0;
        var area2 = 0;
        for(var i = 0; i < n; i += 1) {
            const p1 = poly[i];
            const p2 = poly[i + 1 < n ? i + 1 : 0];
            area2 += p1[0] * p2[1] - p2[0] * p1[1];
        }
        return abs(area2) / 2;
    };

    // -- geometry gathering

    const gatherPlanarFaces = function(context is Context, faces is Query) returns array {
        var out = [];
        for(var face in evaluateQuery(context, qGeometry(faces, GeometryType.PLANE))) {
            const plane = try(evPlane(context, { "face": face }));
            if(plane == undefined) continue;
            out = append(out, {
                "face": face,
                "origin": plane.origin,
                "normal": normalize(plane.normal),
                "area": evArea(context, { "entities": face })
            });
        }
        return out;
    };

    const gatherCylindricalFaces = function(context is Context, faces is Query) returns array {
        var out = [];
        for(var face in evaluateQuery(context, qGeometry(faces, GeometryType.CYLINDER))) {
            const def = try(evSurfaceDefinition(context, { "face": face }));
            if(def == undefined || def.coordSystem == undefined) continue;
            const axisPoint = def.coordSystem.origin;
            const axisDir = normalize(def.coordSystem.zAxis);

            // To detect if this is an external/convex surface, we sample a point and compare the face normal there.
            var isExternal = true;
            const sample = try(evFaceTangentPlanes(context, {
                "face": face, "parameters": [vector(0.5, 0.5)], "returnUndefinedOutsideFace": true
            })[0]);
            if(sample != undefined) {
                const toSample = sample.origin - axisPoint;
                const radial = toSample - dot(toSample, axisDir) * axisDir;
                if(dot(radial, radial) > (1e-9 * meter) ^ 2) {
                    isExternal = dot(normalize(radial), sample.normal) > 0;
                }
            }

            out = append(out, {
                "face": face, "axisPoint": axisPoint, "axisDir": axisDir,
                "radius": def.radius, "area": evArea(context, { "entities": face }),
                "external": isExternal
            });
        }
        return out;
    };

    /** Project sampled points from a set of coplanar faces into 2D around a center point. */
    const sampleCrossSection2D = function(context is Context, faceQueries is array, normal is Vector, center is Vector) returns array {
        const u = arbitraryPerpendicular(normal);
        const v = cross(normal, u);
        var pts2d = [];
        for(var fq in faceQueries) {
            for(var vtx in evaluateQuery(context, qAdjacent(fq, AdjacencyType.VERTEX))) {
                const p = try silent(evVertexPoint(context, { "vertex": vtx }));
                if(p != undefined) pts2d = append(pts2d, [dot(p - center, u) / meter, dot(p - center, v) / meter]);
            }
        }
        return pts2d;
    };

    /** Get the hull area of a cross-section */
    const hullCrossSectionArea = function(hull is array) returns ValueWithUnits {
        if(size(hull) < 3) return 0 * meter ^ 2;
        return polygonArea(hull) * meter ^ 2;
    };

    // -- rotational symmetry
    
    const PI_VALUE = 180 * degree;

    /** Generate a radial profile based on the convex hull of the projected 2D points. */
    const radialProfile = function(hull is array, numBins is number) returns array {
        var bins = [];
        for(var i = 0; i < numBins; i += 1) bins = append(bins, -1);
        
        const hullPointCount = size(hull);
        if(hullPointCount == 0) return bins;

        // cast a ray for each bin to find where it intersects the hull edges
        for(var b = 0; b < numBins; b += 1) {
            var theta = (b + 0.5) / numBins * (2 * PI_VALUE);
            var dx = cos(theta);
            var dy = sin(theta);

            var maxRadius = -1;

            // check the ray against every edge of the convex hull
            for(var i = 0; i < hullPointCount; i += 1) {
                var p1 = hull[i];
                var p2 = hull[(i + 1) % hullPointCount]; // Wrap around

                // calculate intersection between the ray R(origin, dir) and segment L(p1, p2)
                var det = (p2[0] - p1[0]) * dy - (p2[1] - p1[1]) * dx;

                // if det is 0, the ray is parallel
                if(abs(det) > 1e-9) {
                    // parameter on L [0, 1]
                    var u = (p1[1] * dx - p1[0] * dy) / det;
                    
                    // if 0 < u < 1, R intersects L
                    if(u >= -1e-9 && u <= 1.0 + 1e-9) {
                        // intersection distance from the origin on R
                        var t = (p1[1] * p2[0] - p1[0] * p2[1]) / det;
                        if(t > maxRadius) maxRadius = t;
                    }
                }
            }
            bins[b] = maxRadius;
        }
        
        return bins;
    };

    /** Score how well the radial profile matches a given symmetry order. */
    const symmetryScoreForOrder = function(bins is array, order is number) returns number {
        const numBins = size(bins);
        const shift = round(numBins / order);
        if(shift < 1) return 0;

        var sumErr = 0; var sumR = 0; var compared = 0;
        for(var i = 0; i < numBins; i += 1) {
            const j = (i + shift) >= numBins ? (i + shift - numBins) : (i + shift);
            if(bins[i] < 0 || bins[j] < 0) continue;
            sumErr += abs(bins[i] - bins[j]);
            sumR += 0.5 * (bins[i] + bins[j]);
            compared += 1;
        }
        if(compared < numBins / 2 || sumR < 1e-9) return 0; // too sparse to trust
        return max(0, 1 - sumErr / sumR);
    };

    const rotationalSymmetryScore = function(hull is array) returns map {
        const bins = radialProfile(hull, SYMMETRY_ANGLE_BINS);
        var bestOrder = 1; var bestScore = 0;
        for(var order in SYMMETRY_ORDERS) {
            const s = symmetryScoreForOrder(bins, order);
            if(s > bestScore) { bestScore = s; bestOrder = order; }
        }
        return { "score": bestScore, "order": bestOrder, "bins": bins };
    };

    /** Find where the candidate axis line pierces a plane defined by a point and normal. */
    const axisPlaneIntersection = function(axisOrigin is Vector, axisDir is Vector, planeOrigin is Vector, planeNormal is Vector) returns Vector {
        const denom = dot(axisDir, planeNormal);
        if(abs(denom) < 1e-6) return planeOrigin; // shouldn't happen for a genuine end face; fail safe
        const t = dot(planeOrigin - axisOrigin, planeNormal) / denom;
        return axisOrigin + t * axisDir;
    };

    // -- axis candidates

    /**
     * Group cylindrical faces that share approximately the same axis line.
     * We do this because spline profiles usually have small fillet cylinders
     * sitting on the true part axis, which is a good signal.
     */
    const buildCylinderClusters = function(cylData is array, requireExternalSeed is boolean) returns array {
        var clusters = [];
        var used = [];
        for(var i = 0; i < size(cylData); i += 1) used = append(used, false);

        for(var i = 0; i < size(cylData); i += 1) {
            if(used[i]) continue;
            if(requireExternalSeed && !cylData[i].external) continue;
            const seed = cylData[i];
            var totalArea = seed.area; var count = 1;
            used[i] = true;
            for(var j = 0; j < size(cylData); j += 1) {
                if(j == i || used[j]) continue;
                const c = cylData[j];
                if(abs(dot(c.axisDir, seed.axisDir)) < CYL_AXIS_PARALLEL_COS) continue;
                const toC = c.axisPoint - seed.axisPoint;
                const perp = toC - dot(toC, seed.axisDir) * seed.axisDir;
                if(sqrt(dot(perp, perp)) > 0.05 * max(seed.radius, c.radius)) continue;
                totalArea += c.area; count += 1;
                used[j] = true;
            }
            clusters = append(clusters, { "origin": seed.axisPoint, "axis": seed.axisDir, "totalArea": totalArea, "count": count });
        }
        return clusters;
    };

    const dominantCylinderAxis = function(cylData is array) {
        if(size(cylData) == 0) return undefined;

        // prefer axes anchored on an external surface
        var clusters = buildCylinderClusters(cylData, true);
        if(size(clusters) == 0) clusters = buildCylinderClusters(cylData, false); // fallback

        var best = clusters[0];
        for(var cl in clusters) {
            // more collinear members beats bigger area
            // maybe this isn't the best metric, but it seems to work well.
            if(cl.count > best.count || (cl.count == best.count && cl.totalArea > best.totalArea)) best = cl;
        }
        return { "origin": best.origin, "axis": best.axis, "source": "cylinder" };
    };

    const farthestPointAxis = function(pts is array) returns map {
        const n = size(pts);
        if(n < 2) return undefined;

        var farA = pts[0]; var farAd = -1 * meter ^ 2;
        for(var p in pts) {
            const d = dot(p - pts[0], p - pts[0]);
            if(d > farAd) { farAd = d; farA = p; }
        }
        var farB = farA; var farBd = -1 * meter ^ 2;
        for(var p in pts) {
            const d = dot(p - farA, p - farA);
            if(d > farBd) { farBd = d; farB = p; }
        }
        if(farBd < (1e-6 * meter) ^ 2) return undefined;

        return { "origin": 0.5 * (farA + farB), "axis": normalize(farB - farA), "source": "farthestPoint" };
    };

    const inertialAxis = function(massProps is map) returns map {
        const I = massProps.inertia / (kilogram * meter ^ 2);
        const U = svd(I).u; // values are decreasing, so the last column is the long axis
        const axis = normalize(vector(U[0][2], U[1][2], U[2][2]));
        return { "origin": massProps.centroid, "axis": axis, "source": "inertia" };
    };

    // -- plate test

    const findPlate = function(planarData is array, totalArea) {
        var big = [];
        for(var f in planarData) if(f.area > MIN_PLANAR_AREA_FRACTION * totalArea) big = append(big, f);
        for(var i = 1; i < size(big); i += 1) {
            var j = i;
            const item = big[i];
            while(j > 0 && big[j - 1].area < item.area) { big[j] = big[j - 1]; j -= 1; }
            big[j] = item;
        }

        var best = undefined;
        const n = min(size(big), 10);
        for(var i = 0; i < n; i += 1) {
            for(var j = i + 1; j < n; j += 1) {
                const a = big[i]; const b = big[j];
                if(dot(a.normal, b.normal) > -0.98) continue;

                const thickness = abs(dot(b.origin - a.origin, a.normal));
                if(thickness < 1e-6 * meter) continue;

                const combinedFrac = (a.area + b.area) / totalArea;
                const charLength = sqrt(max(a.area, b.area));
                const thicknessRatio = thickness / charLength;

                if(combinedFrac < PLATE_MIN_COMBINED_AREA_FRAC) continue;
                if(thicknessRatio > PLATE_MAX_THICKNESS_RATIO) continue;

                const score = combinedFrac * (1 - min(thicknessRatio / PLATE_MAX_THICKNESS_RATIO, 1));
                if(best == undefined || score > best.score) {
                    best = { "faceA": a, "faceB": b, "thickness": thickness, "score": score };
                }
            }
        }
        return best;
    };

    // -- end-face search

    const findEndFaces = function(context is Context, body is Query, axisOrigin is Vector, axisDir is Vector, planarData is array) {
        const cs = coordSystem(axisOrigin, axisDir, arbitraryPerpendicular(axisDir));
        const bbox = evBox3d(context, { "topology": body, "cSys": cs, "tight": true });
        const span = bbox.maxCorner[0] - bbox.minCorner[0];
        if(span < 1e-6 * meter) return undefined;

        // find the two extreme axial positions among aligned faces.
        var minT = 1e30; var maxT = -1e30;
        var alignedCount = 0;
        for(var f in planarData) {
            if(abs(dot(f.normal, axisDir)) < ANGLE_ALIGN_COS) continue;
            alignedCount += 1;
            const t = dot(f.origin - axisOrigin, axisDir) / span;
            if(t < minT) minT = t;
            if(t > maxT) maxT = t;
        }
        if(alignedCount < 2) return undefined;

        // gather every aligned face within tolerance
        var minGroup = []; var maxGroup = [];
        for(var f in planarData) {
            if(abs(dot(f.normal, axisDir)) < ANGLE_ALIGN_COS) continue;
            const t = dot(f.origin - axisOrigin, axisDir) / span;
            if(abs(t - minT) < END_GROUP_T_TOL) minGroup = append(minGroup, f);
            if(abs(t - maxT) < END_GROUP_T_TOL) maxGroup = append(maxGroup, f);
        }
        if(size(minGroup) == 0 || size(maxGroup) == 0) return undefined;

        var minArea = 0 * meter ^ 2; var minRep = minGroup[0];
        for(var f in minGroup) { minArea += f.area; if(f.area > minRep.area) minRep = f; }
        var maxArea = 0 * meter ^ 2; var maxRep = maxGroup[0];
        for(var f in maxGroup) { maxArea += f.area; if(f.area > maxRep.area) maxRep = f; }

        var minFaceQueries = []; for(var f in minGroup) minFaceQueries = append(minFaceQueries, f.face);
        var maxFaceQueries = []; for(var f in maxGroup) maxFaceQueries = append(maxFaceQueries, f.face);

        return {
            "minFaceQueries": minFaceQueries, "maxFaceQueries": maxFaceQueries,
            "minRep": minRep, "maxRep": maxRep,
            "minFaceArea": minArea, "maxFaceArea": maxArea,
            "certainty": maxT - minT,
            "cs": cs, "bbox": bbox, "span": span
        };
    };

    // -- the actual classification, finally

    const classifyBody = function(context is Context, body is Query) returns map {
        const partID = transientQueriesToStrings([body])[0];
        const faces = qOwnedByBody(body, EntityType.FACE);

        const planarData = gatherPlanarFaces(context, faces);
        const cylData = gatherCylindricalFaces(context, faces);

        var totalArea = 0 * meter ^ 2;
        for(var f in planarData) totalArea += f.area;
        for(var c in cylData) totalArea += c.area;

        const aabb = evBox3d(context, { "topology": body, "tight": true });
        const aabbDiag = sqrt(dot(aabb.maxCorner - aabb.minCorner, aabb.maxCorner - aabb.minCorner));
        const aabbOut = {
            "min": [aabb.minCorner[0] / meter, aabb.minCorner[1] / meter, aabb.minCorner[2] / meter],
            "max": [aabb.maxCorner[0] / meter, aabb.maxCorner[1] / meter, aabb.maxCorner[2] / meter]
        };

        const respond = function(heuristic is map) returns map {
            const material = getProperty(context, { entity: body, propertyType: PropertyType.MATERIAL });
            return {
                "partID": partID,
                "name": getProperty(context, { entity: body, propertyType: PropertyType.NAME }),
                "material": material != undefined ? {
                    "density": material.density / (kilogram / meter ^ 3),
                    "name": material.name
                } : undefined,
                "appearance": getProperty(context, { entity: body, propertyType: PropertyType.APPEARANCE }),
                "description": getProperty(context, { entity: body, propertyType: PropertyType.DESCRIPTION }),
                "part_number": getProperty(context, { entity: body, propertyType: PropertyType.PART_NUMBER }),
                "revision": getProperty(context, { entity: body, propertyType: PropertyType.REVISION }),
                "aabb": aabbOut,
                "heuristic": heuristic
            };
        };

        const unknownResult = function(sizeArr is array, thickness, confidence, axis, topFace, debugInfo is map) returns map {
            return respond({
                "partType": "unknown", "size": sizeArr, "thickness": thickness,
                "confidence": confidence, "principalAxis": axis, "topFace": topFace,
                "debug": debugInfo
            });
        };

        const computeTopFace = function(context is Context, endFaces is map) returns map {
            const topFaceQuery = endFaces.maxFaceArea >= endFaces.minFaceArea ? endFaces.maxRep.face : endFaces.minRep.face;
            const topFaceNormal = try(evPlane(context, { "face": topFaceQuery }).normal);
            return {
                "id": transientQueriesToStrings([topFaceQuery])[0],
                "normal": topFaceNormal != undefined ? [topFaceNormal[0], topFaceNormal[1], topFaceNormal[2]] : undefined
            };
        };

        if(totalArea == 0 * meter ^ 2) return unknownResult([0, 0], 0, 0, undefined, undefined, { "reason": "zero surface area" });

        // plate tests
        const sheetMetal = try(isSheetMetalModelActive(context, body)) == true;
        const plate = findPlate(planarData, totalArea);

        if(plate != undefined && (plate.score > PLATE_MIN_SCORE || sheetMetal)) {
            const top = plate.faceA.area >= plate.faceB.area ? plate.faceA : plate.faceB;
            const plateCs = coordSystem(top.origin, arbitraryPerpendicular(top.normal), top.normal);
            const plateBox = evBox3d(context, { "topology": body, "cSys": plateCs, "tight": true });

            return respond({
                "partType": "plate",
                "size": [
                    (plateBox.maxCorner[0] - plateBox.minCorner[0]) / meter,
                    (plateBox.maxCorner[1] - plateBox.minCorner[1]) / meter
                ],
                "thickness": plate.thickness / meter,
                "confidence": max(min(plate.score, 1.0), 0.0),
                "principalAxis": undefined,
                "topFace": {
                    "id": transientQueriesToStrings([top.face])[0],
                    "normal": [top.normal[0], top.normal[1], top.normal[2]]
                },
                "debug": { "plateScore": plate.score, "sheetMetal": sheetMetal }
            });
        }

        // stock tests (shaft or tube)
        const massProps = evApproximateMassProperties(context, { "entities": body, "density": 1 * kilogram / meter ^ 3 });

        var axisCandidates = [];
        const cylAxis = dominantCylinderAxis(cylData);
        if(cylAxis != undefined) axisCandidates = append(axisCandidates, cylAxis);

        var verts = [];
        for(var v in evaluateQuery(context, qOwnedByBody(body, EntityType.VERTEX))) {
            verts = append(verts, evVertexPoint(context, { "vertex": v }));
        }
        const fpAxis = farthestPointAxis(verts);
        if(fpAxis != undefined) axisCandidates = append(axisCandidates, fpAxis);

        axisCandidates = append(axisCandidates, inertialAxis(massProps));

        var best = undefined; var bestSource = undefined; var bestScore = -1;
        for(var cand in axisCandidates) {
            const ef = findEndFaces(context, body, cand.origin, cand.axis, planarData);
            if(ef == undefined) continue;
            // `certainty` is a fraction of each candidate span, so perpendicular holes can score ~1.0
            // against its own tiny span. Weighting by how much of the part's overall size that span 
            // ctually accounts for fixes those being misidentified as primary axes.
            const spanFrac = aabbDiag > 0 * meter ? min(ef.span / aabbDiag, 1.0) : 0;
            const score = ef.certainty * spanFrac;
            if(score > bestScore + 1e-6) { // small bias so float precision doesn't reorder ties
                best = ef; bestSource = cand.source; bestScore = score;
            }
        }

        if(best == undefined || best.certainty < END_FACE_MIN_CERTAINTY) {
            return unknownResult([0, 0], 0, 0, undefined, undefined, {
                "reason": "no axis candidate found well-separated end faces",
                "bestCertainty": best == undefined ? 0 : best.certainty
            });
        }

        const topFaceInfo = computeTopFace(context, best);

        const sizeY = best.bbox.maxCorner[1] - best.bbox.minCorner[1];
        const sizeZ = best.bbox.maxCorner[2] - best.bbox.minCorner[2];
        const maxNonPrincipal = max(sizeY, sizeZ);
        const principalAxisOut = [best.cs.xAxis[0], best.cs.xAxis[1], best.cs.xAxis[2]];
        const elongation = maxNonPrincipal < 1e-9 * meter ? 1e30 : best.span / maxNonPrincipal;

        // end shape similarity, using the areas of each to measure whether both ends are the same profile
        const endAreaRatio = max(best.minFaceArea, best.maxFaceArea) / min(best.minFaceArea, best.maxFaceArea);
        const endShapeConfidence = 1 / endAreaRatio;

        // project each end's samples about where the candidate axis pierces that plane
        const minCenter = axisPlaneIntersection(best.cs.origin, best.cs.xAxis, best.minRep.origin, best.minRep.normal);
        const maxCenter = axisPlaneIntersection(best.cs.origin, best.cs.xAxis, best.maxRep.origin, best.maxRep.normal);
        const minPts2d = sampleCrossSection2D(context, best.minFaceQueries, best.minRep.normal, minCenter);
        const maxPts2d = sampleCrossSection2D(context, best.maxFaceQueries, best.maxRep.normal, maxCenter);
        const minHull = convexHull2D(minPts2d);
        const maxHull = convexHull2D(maxPts2d);

        // debug: draw all the sampled points
        // for(var point2d in minPts2d) {
        //     // transform back to the plane defined by minCenter and best.minRep.normal
        //     const u = arbitraryPerpendicular(best.minRep.normal);
        //     const v = cross(best.minRep.normal, u);
        //     addDebugPoint(context, minCenter + (point2d[0] * u + point2d[1] * v) * meter, DebugColor.CYAN);
        // }
        // for(var point2d in maxPts2d) {
        //     // transform back to the plane defined by maxCenter and best.maxRep.normal
        //     const u = arbitraryPerpendicular(best.maxRep.normal);
        //     const v = cross(best.maxRep.normal, u);
        //     addDebugPoint(context, maxCenter + (point2d[0] * u + point2d[1] * v) * meter, DebugColor.MAGENTA);
        // }

        // Differentiate shafts and tubes with rotational symmetry
        const minSym = rotationalSymmetryScore(minHull);
        const maxSym = rotationalSymmetryScore(maxHull);
        const symmetryScore = min(minSym.score, maxSym.score);
        const symmetryOrder = minSym.score <= maxSym.score ? minSym.order : maxSym.order;

        // debug: draw radial profiles
        // for(var i = 0; i < size(minSym.bins); i += 1) {
        //     const r = minSym.bins[i];
        //     if(r < 0) continue;
        //     const theta = (i + 0.5) / size(minSym.bins) * 2 * PI_VALUE;
        //     const u = arbitraryPerpendicular(best.minRep.normal);
        //     const v = cross(best.minRep.normal, u);
        //     addDebugLine(context, minCenter, minCenter + (r * cos(theta) * u + r * sin(theta) * v) * meter, DebugColor.BLUE);
        // }
        // for(var i = 0; i < size(maxSym.bins); i += 1) {
        //     const r = maxSym.bins[i];
        //     if(r < 0) continue;
        //     const theta = (i + 0.5) / size(maxSym.bins) * 2 * PI_VALUE;
        //     const u = arbitraryPerpendicular(best.maxRep.normal);
        //     const v = cross(best.maxRep.normal, u);
        //     addDebugLine(context, maxCenter, maxCenter + (r * cos(theta) * u + r * sin(theta) * v) * meter, DebugColor.RED);
        // }

        // if something is very asymmetrical, it's unlikely to be anything
        if(symmetryScore < SYMMETRY_MIN_SCORE) {
            return unknownResult([sizeY / meter, sizeZ / meter], best.span / meter, best.certainty * 0.3, undefined, topFaceInfo, {
                "reason": "cross-section not rotationally symmetric about the candidate axis",
                "symmetryScore": symmetryScore, "symmetryOrder": symmetryOrder, "axisSource": bestSource
            });
        }

        // our second test is based on fill ratio, so the ratio between the object's
        // cross section and convex hull. hollow shapes (lower fill area) are considered tubes.
        const minHullArea = hullCrossSectionArea(minHull);
        const maxHullArea = hullCrossSectionArea(maxHull);
        const crossSectionArea = min(minHullArea, maxHullArea);
        const impliedFilledVolume = crossSectionArea * best.span;
        const fillRatio = impliedFilledVolume > 0 * meter ^ 3 ? massProps.volume / impliedFilledVolume : 0;

        // round stock (if our axis is from cylindrical faces) doesn't have a length requirement if
        // unfilled; otherwise, this could be a gear or something
        // not a perfect metric, but it allows us to catch a few more cases.
        const elongationOk = (bestSource == "cylinder" && fillRatio < FILL_RATIO_SHAFT_MIN) || (elongation >= ELONGATION_MIN_RATIO);
        if(!elongationOk) {
            return unknownResult([sizeY / meter, sizeZ / meter], best.span / meter, best.certainty * 0.3, undefined, topFaceInfo, {
                "reason": "not elongated enough to be stock", "elongation": elongation, "axisSource": bestSource
            });
        }

        var partType = "unknown";
        var confidence = 0;
        if(fillRatio >= FILL_RATIO_SHAFT_MIN) {
            partType = "shaft";
            confidence = best.certainty * endShapeConfidence * symmetryScore * min(fillRatio, 1.0);
        } else if(fillRatio >= FILL_RATIO_TUBE_MIN) {
            // cylinder stock is always a shaft; maybe this isn't a perfect
            // metric, but it seems to work well in practice
            partType = bestSource == "cylinder" ? "shaft" : "tube";
            const bandCenter = 0.5 * (FILL_RATIO_SHAFT_MIN + FILL_RATIO_TUBE_MIN);
            const bandHalfWidth = 1.0 * (FILL_RATIO_SHAFT_MIN - FILL_RATIO_TUBE_MIN);
            confidence = best.certainty * endShapeConfidence * symmetryScore * (1 - abs(fillRatio - bandCenter) / bandHalfWidth);
        }

        if(partType == "unknown" || confidence < MIN_CLASSIFICATION_CONFIDENCE) {
            return unknownResult([sizeY / meter, sizeZ / meter], best.span / meter, max(confidence, 0), principalAxisOut, topFaceInfo, {
                "reason": confidence < MIN_CLASSIFICATION_CONFIDENCE ? "classification uncertain" : "fill ratio too low",
                "axisSource": bestSource, "elongation": elongation, "certainty": best.certainty,
                "fillRatio": fillRatio, "endAreaRatio": endAreaRatio,
                "symmetryScore": symmetryScore, "symmetryOrder": symmetryOrder,
                "minFaceAreaRaw": best.minFaceArea / meter ^ 2, "maxFaceAreaRaw": best.maxFaceArea / meter ^ 2,
                "minHullArea": minHullArea / meter ^ 2, "maxHullArea": maxHullArea / meter ^ 2
            });
        }

        return respond({
            "partType": partType,
            "size": [sizeY / meter, sizeZ / meter],
            "thickness": best.span / meter,
            "confidence": min(confidence, 1.0),
            "principalAxis": principalAxisOut,
            "topFace": topFaceInfo,
            "debug": {
                "axisSource": bestSource, "elongation": elongation, "certainty": best.certainty,
                "fillRatio": fillRatio, "endAreaRatio": endAreaRatio,
                "symmetryScore": symmetryScore, "symmetryOrder": symmetryOrder,
                "minFaceAreaRaw": best.minFaceArea / meter ^ 2, "maxFaceAreaRaw": best.maxFaceArea / meter ^ 2,
                "minHullArea": minHullArea / meter ^ 2, "maxHullArea": maxHullArea / meter ^ 2
            }
        });
    };

    const results = evaluateQuery(tl_context, qOwnerBody(qTransient('{{selectionID}}')));
    if(size(results) == 0) return { "error": "No body selected" };
    const body = results[0];
    if(size(qBodyType(body, BodyType.SOLID)) == 0) return { "error": "Selected body is not a solid" };
    return classifyBody(tl_context, body);
}

/**
Debugging feature to visualize:

annotation { "Feature Type Name" : "Debug Heuristics 3" }
export const debugPrincipalAxes = defineFeature(function(context is Context, id is Id, definition is map)
    precondition {
        annotation {
            "Name": "Body",
            "Filter": EntityType.BODY && BodyType.SOLID
        } definition.body is Query;
    }
    {
        const results = evaluateQuery(context, definition.body);
        if(size(results) == 0) return { "error": "No body selected" };
        
        for(var body in results) {
            if(size(qBodyType(body, BodyType.SOLID)) == 0) return { "error": "Selected body is not a solid" };
            const result = classifyBody(context, body);
            debug(context, result.heuristic.partType);
            debug(context, result);
            
            const centroid = evApproximateCentroid(context, { "entities": body });
            if(result.heuristic.principalAxis != undefined) {
                addDebugArrow(context, centroid, centroid + vector(result.heuristic.principalAxis) * meter * 0.15, .25 * centimeter, DebugColor.RED);
            }
            if(result.heuristic.topFace != undefined) {
                // highlight the top face
                const top_face_query = qTransient(result.heuristic.topFace.id);
                debug(context, top_face_query, DebugColor.GREEN);
                const face_centroid = evApproximateCentroid(context, { "entities": top_face_query });
                addDebugArrow(context, face_centroid, face_centroid + vector(result.heuristic.topFace.normal) * meter * 0.05, .25 * centimeter, DebugColor.GREEN);
            }
        }
    }
);
*/