import {
  getMediaGridTileMetrics,
  MEDIA_CONTENT_CONTRACTS,
  MEDIA_GRID_COLUMNS,
} from "../../../services/media/mediaContentContracts";

export { MEDIA_GRID_COLUMNS as SNAP_GRID_COLUMNS };

export const SNAP_GRID_CELL_ASPECT = MEDIA_CONTENT_CONTRACTS.snap.gridCellWidthOverHeight;

export function getSnapGridTileMetrics(containerWidth: number) {
  return getMediaGridTileMetrics("snap", containerWidth);
}
