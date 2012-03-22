var Canvas = require('canvas')
  , Image = Canvas.Image
  , fs = require('fs')
  , counter = 0
  , startingscr = process.argv[2]
  , name = __dirname + '/' + startingscr.split('.')[0];


function downscale(filenamein, filenameout, resdrop, cb){
  var img = new Image;

  img.onerror = function(err){throw err;};

  img.onload = function(){
    var w = img.width / resdrop
      , h = img.height / resdrop
      , canvas = new Canvas(w, h)
      , ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, w, h);

    var out = fs.createWriteStream(filenameout);

    var stream = canvas.createJPEGStream({
      bufsize : 2048,
      quality : 100
    });

    out.on('close', function(){
      if(cb) cb();
    });

    stream.pipe(out);
  };

  img.src = filenamein;

}

function createDiffImg(imgsrc1, imgsrc2, outsrc, cb){
  /*
    Create a differece jpeg, where imgscr1 should be the higher resolution image
  */
  var img1 = new Image
    , img2 = new Image;

  img1.onerror = function(err){throw err;};
  img2.onerror = function(err){throw err;};

  img1.onload = function(){
    var w = img1.width
      , h = img1.height
      , canvas = new Canvas(w,h)
      , ctx = canvas.getContext('2d');

    ctx.drawImage(img1, 0, 0, w, h);
    var data1 = ctx.getImageData(0,0,w,h);

    img2.onload = function(){

      ctx.drawImage(img2,0,0,w,h);
      var data2 = ctx.getImageData(0,0,w,h);

      // make the diff, leveled at 127 and mod 256 (ignoring alpha channel)
      for(var i=0;i<img1.width*img1.height;i++){
          for(var j=0;j<3;j++){
              data1.data[4*i+j] = Math.min(255,Math.max(0,(data1.data[4*i+j]-data2.data[4*i+j])+127)); 
          }
      }

      ctx.putImageData(data1,0,0);

      var out = fs.createWriteStream(outsrc);

      var stream = canvas.createJPEGStream({
        bufsize : 2048,
        quality : 100
      });

      out.on('close', function(){
        if(cb) cb();
      });

      stream.pipe(out);

    }

    img2.src = imgsrc2;
  }

  img1.src = imgsrc1;
}

function testDecode(imgsrc1, imgsrc2, cb){
  var img1 = new Image()
    , img2 = new Image();

  img1.onload = function(){
    img2.onload = function(){
        var w = img2.width
          , h = img2.height
          , canvas = new Canvas(w,h)
          , ctx = canvas.getContext('2d');

        ctx.drawImage(img1,0,0,w,h);
        data1 = ctx.getImageData(0,0,w,h);
        ctx.drawImage(img2,0,0,w,h);
        data2 = ctx.getImageData(0,0,w,h);

        // Use the diff

        for(var i=0;i<img2.width*img2.height;i++){
            for(var j=0;j<3;j++){
                data1.data[4*i+j] = Math.min(255,Math.max(0,(data1.data[4*i+j]+((data2.data[4*i+j]-127) || 0))));
            }
        }

        ctx.putImageData(data1,0,0);

        if(cb) {
          cb(ctx.canvas.toDataURL());
        }
    };
    img2.src = imgsrc2;
  };
  img1.src = imgsrc1;
}

counter = 0;
function phaseTwo(){
  counter++;
  if(counter==2) {
    // images made - make the diffs
    createDiffImg(name+'_med.jpg',name+'_low.jpg',name+'_low_to_med_diff.jpg', function(){
      testDecode(name+'_low.jpg',name+'_low_to_med_diff.jpg',function(medsrc){
        createDiffImg(__dirname + '/' + startingscr,medsrc,name+'_med_to_full_diff.jpg');
      });
    });
  }
}

// make the images
downscale(__dirname + '/' + startingscr, name+'_low.jpg', 4, phaseTwo);
downscale(__dirname + '/' + startingscr, name+'_med.jpg', 2, phaseTwo);