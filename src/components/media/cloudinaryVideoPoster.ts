export const cloudinaryVideoPoster = (url: string) => {
  if (!url.includes("/video/upload/")) {
    return url;
  }
  return url.replace("/video/upload/", "/video/upload/so_0/").replace(/\.(mp4|mov|webm)(\?.*)?$/i, ".jpg$2");
};
