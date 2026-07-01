export const SNAP_GRID_COLUMNS = 3;
export const SNAP_GRID_CELL_ASPECT = 0.58;

export function getSnapGridTileMetrics(containerWidth: number) {
  const tileSize = Math.floor(containerWidth / SNAP_GRID_COLUMNS);
  const tileHeight = Math.floor(tileSize / SNAP_GRID_CELL_ASPECT);
  return { tileSize, tileHeight };
}
