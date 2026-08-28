/**
 * Phase 25: AI Cemetery Mapping & Spatial Intelligence
 *
 * GPS-based grave clustering, cemetery heatmap generation, spatial search,
 * and density analysis. Adds the spatial dimension to complement the
 * genealogy family tree builder (Phase 23).
 *
 * Features:
 *   - Grave clustering by GPS coordinates (DBSCAN-style)
 *   - Cemetery heatmap data (burial density)
 *   - Spatial search (find graves within radius)
 *   - Nearest neighbor analysis
 *   - Density metrics (graves per area)
 *   - Family spatial proximity (are relatives buried close together?)
 */

// ============================================================
// DISTANCE CALCULATIONS
// ============================================================

/**
 * Haversine distance between two GPS points (meters).
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate bounding box for a set of GPS points.
 */
export function calculateBoundingBox(points) {
  if (!points || points.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.lat == null || p.lon == null) continue;
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  if (minLat === Infinity) return null;
  return { minLat, maxLat, minLon, maxLon, centerLat: (minLat + maxLat) / 2, centerLon: (minLon + maxLon) / 2 };
}

/**
 * Estimate area of a bounding box in square meters.
 */
export function boundingBoxArea(bbox) {
  if (!bbox) return 0;
  const widthM = haversineDistance(bbox.minLat, bbox.minLon, bbox.minLat, bbox.maxLon);
  const heightM = haversineDistance(bbox.minLat, bbox.minLon, bbox.maxLat, bbox.minLon);
  return widthM * heightM;
}

// ============================================================
// GPS CLUSTERING (DBSCAN-style)
// ============================================================

/**
 * Cluster graves by GPS proximity using a simplified DBSCAN approach.
 * @param {Array} records - Records with lat/lon
 * @param {Object} options - { eps (meters), minPoints }
 * @returns {Object} Clustering result
 */
export function clusterGraves(records, options = {}) {
  const { eps = 50, minPoints = 3 } = options;

  if (!records || records.length === 0) {
    return { clusters: [], noise: [], totalPoints: 0, clusterCount: 0 };
  }

  // Filter to records with GPS
  const points = records
    .filter(r => r.lat != null && r.lon != null)
    .map((r, i) => ({ id: r.id || `p${i}`, lat: r.lat, lon: r.lon, name: r.name, record: r }));

  if (points.length === 0) {
    return { clusters: [], noise: [], totalPoints: 0, clusterCount: 0 };
  }

  const visited = new Set();
  const clusters = [];
  const noise = [];

  function regionQuery(point) {
    const neighbors = [];
    for (const p of points) {
      if (p.id === point.id) continue;
      const dist = haversineDistance(point.lat, point.lon, p.lat, p.lon);
      if (dist <= eps) neighbors.push(p);
    }
    return neighbors;
  }

  for (const point of points) {
    if (visited.has(point.id)) continue;
    visited.add(point.id);

    const neighbors = regionQuery(point);
    if (neighbors.length < minPoints) {
      noise.push(point);
      continue;
    }

    const cluster = [point];
    const queue = [...neighbors];

    while (queue.length > 0) {
      const q = queue.shift();
      if (!visited.has(q.id)) {
        visited.add(q.id);
        const qNeighbors = regionQuery(q);
        if (qNeighbors.length >= minPoints) {
          queue.push(...qNeighbors);
        }
      }
      if (!cluster.some(c => c.id === q.id)) {
        cluster.push(q);
      }
    }

    clusters.push(cluster);
  }

  // Build cluster summaries
  const clusterSummaries = clusters.map((cluster, i) => {
    const pts = cluster.map(c => ({ lat: c.lat, lon: c.lon }));
    const bbox = calculateBoundingBox(pts);
    const center = bbox ? { lat: bbox.centerLat, lon: bbox.centerLon } : null;
    const radius = cluster.length > 1
      ? Math.max(...cluster.map(c => haversineDistance(center.lat, center.lon, c.lat, c.lon)))
      : 0;

    return {
      clusterId: i,
      pointCount: cluster.length,
      center,
      bbox,
      radiusMeters: Math.round(radius),
      members: cluster.map(c => ({ id: c.id, name: c.name, lat: c.lat, lon: c.lon })),
    };
  });

  clusterSummaries.sort((a, b) => b.pointCount - a.pointCount);

  return {
    clusters: clusterSummaries,
    noise: noise.map(n => ({ id: n.id, name: n.name, lat: n.lat, lon: n.lon })),
    totalPoints: points.length,
    clusterCount: clusterSummaries.length,
    noiseCount: noise.length,
    eps,
    minPoints,
  };
}

// ============================================================
// HEATMAP GENERATION
// ============================================================

/**
 * Generate heatmap grid data for cemetery visualization.
 * @param {Array} records - Records with lat/lon
 * @param {Object} options - { gridSize (cells per side), cemeteryBbox? }
 * @returns {Object} Heatmap data
 */
export function generateHeatmap(records, options = {}) {
  const { gridSize = 20 } = options;

  const points = records.filter(r => r.lat != null && r.lon != null);
  if (points.length === 0) {
    return { grid: [], maxIntensity: 0, totalPoints: 0, gridSize };
  }

  const bbox = options.cemeteryBbox || calculateBoundingBox(points.map(p => ({ lat: p.lat, lon: p.lon })));
  if (!bbox) return { grid: [], maxIntensity: 0, totalPoints: 0, gridSize };

  // Initialize grid
  const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
  const latStep = (bbox.maxLat - bbox.minLat) / gridSize || 0.001;
  const lonStep = (bbox.maxLon - bbox.minLon) / gridSize || 0.001;

  let maxIntensity = 0;

  for (const p of points) {
    const row = Math.floor((p.lat - bbox.minLat) / latStep);
    const col = Math.floor((p.lon - bbox.minLon) / lonStep);
    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
      grid[row][col]++;
      maxIntensity = Math.max(maxIntensity, grid[row][col]);
    }
  }

  // Build heatmap cells
  const cells = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row][col] > 0) {
        cells.push({
          row, col,
          intensity: grid[row][col],
          lat: bbox.minLat + (row + 0.5) * latStep,
          lon: bbox.minLon + (col + 0.5) * lonStep,
        });
      }
    }
  }

  cells.sort((a, b) => b.intensity - a.intensity);

  return {
    grid,
    cells,
    maxIntensity,
    totalPoints: points.length,
    gridSize,
    bbox,
    densityPerCell: points.length / (gridSize * gridSize),
  };
}

// ============================================================
// SPATIAL SEARCH
// ============================================================

/**
 * Find graves within a radius of a point.
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {Array} records - Records to search
 * @param {number} radiusMeters - Search radius
 * @returns {Object} Search results
 */
export function spatialSearch(lat, lon, records, radiusMeters = 500) {
  const results = [];

  for (const r of records) {
    if (r.lat == null || r.lon == null) continue;
    const dist = haversineDistance(lat, lon, r.lat, r.lon);
    if (dist <= radiusMeters) {
      results.push({
        id: r.id,
        name: r.name,
        lat: r.lat,
        lon: r.lon,
        distanceMeters: Math.round(dist),
        cemeteryId: r.cemeteryId || null,
        section: r.section || null,
      });
    }
  }

  results.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return {
    center: { lat, lon },
    radiusMeters,
    totalFound: results.length,
    results,
  };
}

/**
 * Find nearest neighbors for a given record.
 */
export function findNearestNeighbors(record, records, k = 5) {
  if (!record || record.lat == null || record.lon == null) {
    return { neighbors: [], totalFound: 0 };
  }

  const distances = [];
  for (const r of records) {
    if (r.id === record.id || r.lat == null || r.lon == null) continue;
    const dist = haversineDistance(record.lat, record.lon, r.lat, r.lon);
    distances.push({
      id: r.id,
      name: r.name,
      lat: r.lat,
      lon: r.lon,
      distanceMeters: Math.round(dist),
      cemeteryId: r.cemeteryId || null,
      section: r.section || null,
    });
  }

  distances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const neighbors = distances.slice(0, k);

  return {
    source: { id: record.id, name: record.name, lat: record.lat, lon: record.lon },
    neighbors,
    totalFound: neighbors.length,
    nearestDistance: neighbors.length > 0 ? neighbors[0].distanceMeters : null,
    avgDistance: neighbors.length > 0
      ? Math.round(neighbors.reduce((s, n) => s + n.distanceMeters, 0) / neighbors.length)
      : null,
  };
}

// ============================================================
// DENSITY ANALYSIS
// ============================================================

/**
 * Calculate density metrics for a set of graves.
 */
export function calculateDensity(records) {
  const points = records.filter(r => r.lat != null && r.lon != null);
  if (points.length === 0) {
    return { totalGraves: 0, areaSqm: 0, densityPerSqm: 0, densityPerHectare: 0 };
  }

  const bbox = calculateBoundingBox(points.map(p => ({ lat: p.lat, lon: p.lon })));
  const areaSqm = boundingBoxArea(bbox);
  const totalGraves = points.length;

  return {
    totalGraves,
    areaSqm: Math.round(areaSqm),
    densityPerSqm: areaSqm > 0 ? (totalGraves / areaSqm).toFixed(4) : 0,
    densityPerHectare: areaSqm > 0 ? Math.round((totalGraves / areaSqm) * 10000) : 0,
    bbox,
    avgLat: bbox.centerLat,
    avgLon: bbox.centerLon,
  };
}

// ============================================================
// FAMILY SPATIAL PROXIMITY
// ============================================================

/**
 * Analyze spatial proximity of family members.
 * @param {Array} records - Grave records with lat/lon
 * @param {Object} familyTree - Family tree from Phase 23
 * @returns {Object} Family proximity analysis
 */
export function analyzeFamilyProximity(records, familyTree) {
  if (!records || !familyTree || !familyTree.edges) {
    return { familiesAnalyzed: 0, proximateFamilies: 0, avgFamilyDistance: 0 };
  }

  const recordMap = {};
  for (const r of records) {
    if (r.id && r.lat != null && r.lon != null) {
      recordMap[r.id] = r;
    }
  }

  // Build family groups from edges
  const adj = {};
  for (const e of familyTree.edges) {
    const a = e.personA || e.parent;
    const b = e.personB || e.child;
    if (!adj[a]) adj[a] = new Set();
    if (!adj[b]) adj[b] = new Set();
    adj[a].add(b);
    adj[b].add(a);
  }

  // Find connected components
  const visited = new Set();
  const families = [];
  for (const id in adj) {
    if (visited.has(id)) continue;
    const family = [];
    const stack = [id];
    while (stack.length > 0) {
      const curr = stack.pop();
      if (visited.has(curr)) continue;
      visited.add(curr);
      family.push(curr);
      if (adj[curr]) {
        for (const n of adj[curr]) {
          if (!visited.has(n)) stack.push(n);
        }
      }
    }
    families.push(family);
  }

  const analyses = [];
  let totalDistance = 0;
  let distanceCount = 0;
  let proximateCount = 0;

  for (const family of families) {
    const membersWithGPS = family.filter(id => recordMap[id]);
    if (membersWithGPS.length < 2) continue;

    const distances = [];
    for (let i = 0; i < membersWithGPS.length; i++) {
      for (let j = i + 1; j < membersWithGPS.length; j++) {
        const r1 = recordMap[membersWithGPS[i]];
        const r2 = recordMap[membersWithGPS[j]];
        const dist = haversineDistance(r1.lat, r1.lon, r2.lat, r2.lon);
        distances.push({ a: r1.name || r1.id, b: r2.name || r2.id, distanceMeters: Math.round(dist) });
        totalDistance += dist;
        distanceCount++;
      }
    }

    const avgDist = distances.length > 0
      ? Math.round(distances.reduce((s, d) => s + d.distanceMeters, 0) / distances.length)
      : 0;

    const isProximate = avgDist <= 100; // Within 100m

    analyses.push({
      familyMembers: membersWithGPS.length,
      avgDistanceMeters: avgDist,
      minDistance: Math.min(...distances.map(d => d.distanceMeters)),
      maxDistance: Math.max(...distances.map(d => d.distanceMeters)),
      isProximate,
      distances,
    });

    if (isProximate) proximateCount++;
  }

  return {
    familiesAnalyzed: analyses.length,
    proximateFamilies: proximateCount,
    avgFamilyDistance: distanceCount > 0 ? Math.round(totalDistance / distanceCount) : 0,
    analyses,
  };
}

