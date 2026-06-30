export const formatEventRating = (averageRating?: number | null, ratingCount?: number) => {
  if (averageRating == null || !ratingCount) {
    return null;
  }
  return `${averageRating.toFixed(1)} ⭐`;
};
