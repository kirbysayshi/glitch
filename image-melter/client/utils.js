export function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
}

export function downscaleToCanvas(img, maxWidth, maxHeight) {
  const { cvs, ctx } = makeCanvas();  
  const ratio = img.width > img.height
    ? maxWidth / Math.max(img.width, maxWidth)
    : maxHeight / Math.max(img.height, maxHeight);
  cvs.width = img.width * ratio;
  cvs.height = img.height * ratio;
  const sx = 0;
  const sy = 0;
  const swidth = img.width;
  const sheight = img.height;
  const dx = 0;
  const dy = 0;
  const dwidth = cvs.width;
  const dheight = cvs.height;
  ctx.drawImage(img,
    sx, sy, swidth, sheight,
    dx, dy, dwidth, dheight
  );
  return cvs;
}

export const SAFARI_LOG = (text) => {
  const status = document.createElement('div');
  status.innerHTML = `<pre>${text}</pre>`;
  document.body.appendChild(status);
}

export function blobToImage(blob, opt_image, cb) {
  if (!cb) { cb = opt_image; opt_image = null; }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(blob);
  img.onload = function() {
    cb(null, img);
  }
  img.src = url;
}