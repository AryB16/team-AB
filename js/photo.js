// Photos are downscaled and re-encoded before saving, since everything lives in
// localStorage (around 5 MB per site) and phone photos are often 3-5 MB each.
const MAX_SIDE = 900;
const QUALITY = 0.8;

export async function shrinkPhoto(file) {
  if (!file.type.startsWith("image/")) throw new Error("not an image");

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
