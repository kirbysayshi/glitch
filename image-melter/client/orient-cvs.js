import { fileToImage, imageToCanvas, fileToArrayBuffer, } from 'image-juggler';
import exifOrient from 'exif-orient';
import { load as ExifReaderLoad } from 'exifreader';

export function fileToRotatedCanvas(file, cb) {
  fileToImage(file, (err, img) => {
    // Only the first 128 bytes can contain exif data.
    const headerBytes = file.slice(0, 128 * 1024);
    fileToArrayBuffer(headerBytes, (err, ab) => {
      if (err) return cb(err);

      try {
        const tags = ExifReaderLoad(ab);
        const orientation = tags.Orientation;
        exifOrient(img, orientation.value, function (err, cvs) {
          if (err) return cb(err);
          return cb(null, cvs);
        }); 
      } catch (err) {
        // likely no exif tags found.
        imageToCanvas(img, (err, cvs) => {
          if (err) return cb(err);
          return cb(null, cvs);
        });
      }
    }) 
  })
}