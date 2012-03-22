var Canvas = require('canvas')
  , Image = Canvas.Image
  , fs = require('fs')
  , counter = 0
  , startingscr = process.argv[2];


function downscale(filenamein, filenameout, resdrop, cb){
  var img = new Image;

  img.onerror = function(err){throw err;};

  img.onload = function(){
    var w = img.width / resdrop
      , h = img.height / resdrop
      , canvas = new Canvas(w, h)
      , ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, w, h);

    var out = fs.createWriteStream(__dirname + '/' + filenameout);

    var stream = canvas.createJPEGStream({
      bufsize : 2048,
      quality : 100
    });

    out.on('close', function(){
      if(cb) cb();
    });

    stream.pipe(out);
  };

  img.src = __dirname + '/' + filenamein;

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
              data1.data[4*i+j] = Math.min(255,Math.max(0,2*(data1.data[4*i+j]-data2.data[4*i+j])+127)); 
          }
      }

      ctx.putImageData(data1,0,0);

      var out = fs.createWriteStream(__dirname + '/' + outsrc);

      var stream = canvas.createJPEGStream({
        bufsize : 2048,
        quality : 100
      });

      out.on('close', function(){
        if(cb) cb();
      });

      stream.pipe(out);

    }

    img2.src = __dirname +'/' + imgsrc2;
  }

  img1.src = __dirname + '/' + imgsrc1;
}

counter = 0;
function phaseTwo(){
  counter++;
  if(counter==2) {
    // images made - make the diffs
    var name = startingscr.split('.')[0];
    createDiffImg(name+'_med.jpg',name+'_low.jpg',name+'_low_to_med_diff.jpg');
    createDiffImg(startingscr,name+'_med.jpg',name+'_med_to_full_diff.jpg');
  }
}

// make the images
downscale(startingscr, startingscr.split('.')[0]+'_med.jpg', 2, phaseTwo);
downscale(startingscr, startingscr.split('.')[0]+'_low.jpg', 4, phaseTwo);

/*

    console.log(++counter);
    if(counter == resolution){
      createDiffImg('images/test_1.jpg','images/test_2.jpg','images/diff_test.jpg',function(){console.log('should be done!');});
    }
  });
  */