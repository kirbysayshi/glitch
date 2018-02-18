function fileToImage(file, opt_image, cb) {
  if (!cb) { cb = opt_image; opt_image = null; }
  var img = opt_image || document.createElement('img');
  var url = URL.createObjectURL(file);
  img.onload = function() {
    URL.revokeObjectURL(url);
    cb(null, img);
  }
  img.src = url;
}

function imageToCanvas(image, opt_cvs, cb) {
  if (!cb) { cb = opt_cvs; opt_cvs = null; }
  var cvs = opt_cvs || document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = image.width;
  cvs.height = image.height;
  ctx.drawImage(image, 0, 0);
  cb(null, cvs);
}

function makeCanvas() {
  const cvs = document.createElement('canvas');
  const ctx = cvs.getContext('2d');
  return { cvs, ctx };
}

const melterInput = document.querySelector('#melter-input');
melterInput.addEventListener('change', e => {
  e.stopPropagation();
  fileToImage(e.target.files[0], (err, img) => {
    imageToCanvas(img, (err, cvs) => {
      console.log(cvs);
    });
  });
});

function createSlice (ctx, sliceIdx, width) {
  const slice = {
    ...makeCanvas(),
    sliceIdx,
  }

  slice.cvs.width = width;
  slice.cvs.height = ctx.canvas.height;
  slice.ctx.drawImage(ctx.canvas, 0, 0, 
  
  return {
    
  }
}

const initialWipeState = {
  inputCvs: null,
  slices: 10,
  ys: [],
  maxStartOffset: 16, // pixels?
};