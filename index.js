"use strict";

/**
 * Remnant
 *
 * @params {Object} element
 * @params {Object} options
 */

module.exports = remnant
function remnant(element, options) {
  // Define styling options
  var defaults = {
    // Thickness of the line in pixels
    thickness: 8,
    // How far off the original path the lines are
    drift: 14,
    // Number of times the outline is drawn
    circuits: 2,
    // Colours to use and where to use them
    palette: {
      background: '#ffffff',
      stroke: '#000000',
      fill: '#ffffff',
      text: '#000000',
      debug: 'blue'
    },
    word: 'helloworld',
    // font: 'Italic 42px Arial',
    font: {
      family: 'Arial',
      size: 42,
      weight: 'normal',
      style: 'normal',
      variant: 'normal'
    },
    // Animation frames per second
    refresh: false,
    // Image settings
    imageQuality: 80,
    // Additional classes
    class: 'remnant',
    startFromX: 0,
    startFromY: 0,
    scale: window.devicePixelRatio,
    defaultShadow: -15,
    defaultHighlight: 15,
    shadingOffset: 20,
    width: 1000,
    height: 1000,
    lineJoin: 'round',
    lineCap: 'round',
    lineDash: '',
    debug: false,
    datgui: false
  };

  options.palette = mergeDeep(defaults.palette, options.palette);
  options.font = mergeDeep(defaults.font, options.font);
  options = {...defaults, ...options};

  // Define regular expressions
  var sequenceRegEx = /[a-z][^a-z]*/gi;
  var codeRegEx = /\s*([chlvmz])/gi;
  var coordsRegEx = /\s*([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/gi;
  
  var rgbRegEx = /rgb\((\d{1,3}%?\s?),\s?(\d{1,3}%?\s?),\s?(\d{1,3}%?\s?)\)/i;
  var hslRegEx = /hsl\((\d{1,3}%?\s?),\s?(\d{1,3}%?\s?),\s?(\d{1,3}%?\s?)\)/i;
  var hexRegEx = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  // var strRegEx = /^[a-zA-Z]+$/gi;

  var frameCounter = 0;
  var timelineCounter = 0;
  
  var paths = [];
  var canvasRendered = false;
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext("2d");
  var image = document.createElement('img');

  // https://stackoverflow.com/questions/27936772/how-to-deep-merge-instead-of-shallow-merge
  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
  
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
  
    return mergeDeep(target, ...sources);
  }
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  window.addEventListener('DOMContentLoaded', () => {
    var el = document.querySelectorAll(element);
    if(el.length === 0) {
      return false;
    }
    el[0].style.display = "none";

    if(options.datgui) {
      const dat = require('dat.gui');
      var gui = new dat.GUI();

      // Settings
      gui.add(options, "thickness").min(1).max(50).step(1).onChange(() => {
        init();
      });
      gui.add(options, "drift").min(1).max(50).step(1).onChange(() => {
        init();
      });
      gui.add(options, "circuits").min(1).max(50).step(1).onChange(() => {
        init();
      });
      gui.add(options, "imageQuality").min(1).max(100).step(1).onChange(() => {
        init();
      });
      gui.add(options, "word").onChange(() => {
        init();
      });
      // Font
      gui.add(options.font, 'family', {Arial:'Arial',Georgia:'Georgia','Courier New':'Courier New'}).onChange(() => {
        init();
      });
      gui.add(options.font, 'size').min(1).max(1000).step(1).onChange(() => {
        init();
      });
      gui.add(options.font, 'weight', {normal:'normal',bold:'bold',bolder:'bolder',lighter:'lighter'}).onChange(() => {
        init();
      });
      gui.add(options.font, 'style', {normal:'normal',italic:'italic',oblique:'oblique'}).onChange(() => {
        init();
      });
      gui.add(options.font, 'variant', {normal:'normal','small-caps':'small-caps'}).onChange(() => {
        init();
      });
      // Colours
      gui.addColor(options.palette, 'stroke').onChange(() => {
        init();
      });
      gui.addColor(options.palette, 'background').onChange(() => {
        init();
      });
      gui.addColor(options.palette, 'fill').onChange(() => {
        init();
      });
      gui.addColor(options.palette, 'text').onChange(() => {
        init();
      });
      // Shading
      gui.add(options, "defaultShadow").min(-50).max(50).step(1).onChange(() => {
        init();
      });
      gui.add(options, "defaultHighlight").min(-50).max(50).step(1).onChange(() => {
        init();
      });
      gui.add(options, "shadingOffset").min(1).max(100).step(1).onChange(() => {
        init();
      });
      // Strokes
      gui.add(options, 'lineJoin', {arcs:'arcs',bevel:'bevel',miter:'miter','miter-clip':'miter-clip',round:'round'}).onChange(() => {
        init();
      });
      gui.add(options, 'lineCap', {butt:'butt',round:'round',square:'square'}).onChange(() => {
        init();
      });
      gui.add(options, "lineDash").onChange(() => {
        init();
      });
      // Debug
      gui.add(options, "debug").onChange(() => {
        init();
      });
    }

    init();

    if(options.refresh) {
      limitLoop(init, options.refresh);
    }
    
    function init() {
      if(!canvasRendered) {
        setupCanvas();
      }
      
      paths = [];
      for (var y = 1; y <= options.circuits; y++) {
        generatePaths(y);
      }

      drawPaths();

      if(options.debug) {
        debug();
      }

      if(options.word) {
        addWord();
      }

      if(!options.refresh) {
        setupImage();
        if(!options.datgui) {
          removeElement();
        }
      }
    }

    /**
     * Private functions
     */
    // Loop for the animation
    function limitLoop(fn, fps) {
      // Use var then = Date.now(); if you don't care about targetting < IE9
      var then = new Date().getTime();
      // Custom fps, otherwise fallback to 60
      fps = fps || 60;
      var interval = 1000 / fps;
      return (function loop(time) {
          frameCounter++;
          if(frameCounter % fps === 0) {
            frameCounter = 0;
            timelineCounter++;
          }
          requestAnimationFrame(loop);
          // Again, Date.now() if it's available
          var now = new Date().getTime();
          var delta = now - then;
          if (delta > interval) {
            // Update time now - (delta % interval) is an improvement over just using then = now, which can end up lowering overall fps
            then = now - (delta % interval);
            // Call the fn, passing current fps to it
            fn(frames);
          }
      }(0));
    };

    function removeElement() {
      el[0].parentNode.removeChild(el[0]);
    }

    function setupImage() {
      image.src = canvas.toDataURL('image/jpeg', options.imageQuality/100);
      image.height = options.height;
      image.width = options.width;

      const d = new Date();
      const year = d.getFullYear();
      const month = ('0' + (1 + d.getMonth())).slice(-2);
      const date = d.getDate();
      const hour = d.getHours();
      const minutes = d.getMinutes();
      const seconds = d.getSeconds();

      // <a href="data:image/gif;base64,R0l...QA7" download="some_name.gif">
      //   <img src="data:image/gif;base64,R0l...QA7" width="16" height="14" alt="embedded folder icon"/>
      // </a>
      image.alt = `Remnant ${year}-${month}-${date} at ${hour}.${minutes}.${seconds}.jpeg`;
      el[0].parentNode.insertBefore(image, el[0].nextSibling);
    }

    function setupCanvas() {
      canvas.width = options.width ? options.width * options.scale : el[0].getAttribute('width') * options.scale;
      canvas.height = options.height ? options.height * options.scale : el[0].getAttribute('height') * options.scale;
      canvas.style.width = options.width || el[0].getAttribute('width');
      canvas.style.height = options.height || el[0].getAttribute('height');

      var classesArray = options.class.split(" ");
      for(var i = 0; i < classesArray.length; i++) {
        canvas.classList.add(classesArray[i]);
      }

      // Aspect Ratio
      var aspectRatio = (el[0].getAttribute('width') * options.scale) / (el[0].getAttribute('height') * options.scale);
      var computedWidth = canvas.height * aspectRatio;
      var computedHeight = canvas.width / aspectRatio;

      if(computedWidth < canvas.width) {
        options.startFromX = (canvas.width - computedWidth) / 2;
        options.scale = (computedWidth / (el[0].getAttribute('width') * options.scale)) * options.scale;
      } else {
        options.startFromY = (canvas.height - computedHeight) / 2;
        options.scale = (computedHeight / (el[0].getAttribute('height') * options.scale)) * options.scale;
      }

      if (options.refresh) {
        el[0].parentNode.insertBefore(canvas, el[0].nextSibling);
        canvasRendered = true;
      }
    }

    function addWord() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = getColour('text');
      ctx.font = `${options.font.style} ${options.font.variant} ${options.font.weight} ${options.font.size}px ${options.font.family}`;
      var textWidth = ctx.measureText(options.word).width;
      var textHeight = ctx.measureText('O').width;
      ctx.fillText(options.word , (canvas.width / 2) - (textWidth / 2), (canvas.height / 2) + (textHeight / 2));

      ctx.translate(options.startFromX, options.startFromY);
      ctx.scale(options.scale, options.scale);
    }

    function drawPaths() {
      // Reset the transformations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = getColour('background');
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.translate(options.startFromX, options.startFromY);
      ctx.scale(options.scale, options.scale);

      paths.forEach(path => {
        ctx.save();
        if(path.circuit === 1) {

          //Shadow layer
          ctx.beginPath();
          ctx.fillStyle = (path.fill === "transparent" || path.fill === false) ? "transparent" : modifyLightness(path.fill, options.defaultShadow);
          path.commands.forEach(command => {
            if(command.code === "M") {
              ctx.moveTo(command.d.x, command.d.y);
            }
            if(command.code === "L" || command.code === "H" || command.code === "V") {
              ctx.lineTo(command.d.x, command.d.y);
            }
            if(command.code === "C") {
              ctx.bezierCurveTo(command.d1.x, command.d1.y, command.d2.x, command.d2.y, command.d.x, command.d.y);
            }
            if(command.code === "Z") { }
          });
          ctx.fill();

          //Highlight clip
          ctx.beginPath();
          path.commands.forEach(command => {
            if(command.code === "M") {
              ctx.moveTo(shadingCoords(command.d.x, -options.shadingOffset), shadingCoords(command.d.y, -options.shadingOffset));
            }
            if(command.code === "L" || command.code === "H" || command.code === "V") {
              ctx.lineTo(shadingCoords(command.d.x, -options.shadingOffset), shadingCoords(command.d.y, -options.shadingOffset));
            }
            if(command.code === "C") {
              ctx.bezierCurveTo(shadingCoords(command.d1.x, -options.shadingOffset), shadingCoords(command.d1.y, -options.shadingOffset), shadingCoords(command.d2.x, -options.shadingOffset), shadingCoords(command.d2.y, -options.shadingOffset), shadingCoords(command.d.x, -options.shadingOffset), shadingCoords(command.d.y, -options.shadingOffset));
            }
            if(command.code === "Z") { }
          });
          ctx.clip();

          //Highlight layer
          ctx.beginPath();
          ctx.fillStyle = (path.fill === "transparent" || path.fill === false) ? "transparent" : modifyLightness(path.fill, options.defaultHighlight);
          path.commands.forEach(command => {
            if(command.code === "M") {
              ctx.moveTo(command.d.x, command.d.y);
            }
            if(command.code === "L" || command.code === "H" || command.code === "V") {
              ctx.lineTo(command.d.x, command.d.y);
            }
            if(command.code === "C") {
              ctx.bezierCurveTo(command.d1.x, command.d1.y, command.d2.x, command.d2.y, command.d.x, command.d.y);
            }
            if(command.code === "Z") { }
          });
          ctx.fill();

          //Original
          ctx.beginPath();
          path.commands.forEach(command => {
            if(command.code === "M") {
              ctx.moveTo(shadingCoords(command.d.x, options.shadingOffset), shadingCoords(command.d.y, options.shadingOffset));
            }
            if(command.code === "L" || command.code === "H" || command.code === "V") {
              ctx.lineTo(shadingCoords(command.d.x, options.shadingOffset), shadingCoords(command.d.y, options.shadingOffset));
            }
            if(command.code === "C") {
              ctx.bezierCurveTo(shadingCoords(command.d1.x, options.shadingOffset), shadingCoords(command.d1.y, options.shadingOffset), shadingCoords(command.d2.x, options.shadingOffset), shadingCoords(command.d2.y, options.shadingOffset), shadingCoords(command.d.x, options.shadingOffset), shadingCoords(command.d.y, options.shadingOffset));
            }
            if(command.code === "Z") { }
          });
          ctx.clip();
          ctx.fillStyle = path.fill;
          path.commands.forEach(command => {
              if(command.code === "M") {
                ctx.moveTo(command.d.x, command.d.y);
              }
              if(command.code === "L" || command.code === "H" || command.code === "V") {
                ctx.lineTo(command.d.x, command.d.y);
              }
              if(command.code === "C") {
                ctx.bezierCurveTo(command.d1.x, command.d1.y, command.d2.x, command.d2.y, command.d.x, command.d.y);
              }
              if(command.code === "Z") { }
          });
          ctx.fill();

          ctx.restore();
        } else {
            ctx.beginPath();
            ctx.setLineDash(options.lineDash.split(':'));
            ctx.lineWidth = options.thickness;
            ctx.strokeStyle = path.stroke;
            ctx.lineJoin = options.lineJoin;
            ctx.lineCap = options.lineJoin;
            path.commands.forEach(command => {
              if(command.code === "M") {
                ctx.moveTo(command.d.x, command.d.y);
              }
              if(command.code === "L" || command.code === "H" || command.code === "V") {
                ctx.lineTo(command.d.x, command.d.y);
              }
              if(command.code === "C") {
                ctx.bezierCurveTo(command.d1.x, command.d1.y, command.d2.x, command.d2.y, command.d.x, command.d.y);
              }
              if(command.code === "Z") { }
            });
            ctx.stroke();
        }
      });
    }

    function debug() {
      var debugPaths = paths.filter(path => {
        return path.circuit === 1;
      });
      var radius = 2;
      debugPaths.forEach(path => {
        ctx.lineWidth = 1;
        ctx.strokeStyle = getColour('debug');
        path.commands.forEach(command => {
          ctx.beginPath();
          ctx.arc(command.d.x, command.d.y, radius, 0, 2 * Math.PI);
          if(command.code === "C") {
            ctx.arc(command.d1.x, command.d1.y, radius, 0, 2 * Math.PI);
            ctx.arc(command.d2.x, command.d2.y, radius, 0, 2 * Math.PI);
          }
          ctx.closePath();
          ctx.stroke();
        });
      });
    }

    function generatePaths(circuit) {
      var domPaths = getTagNameResults(el[0], 'path');

      for (var i = 0; i < domPaths.length; i++) {
        var d = domPaths[i].getAttribute("d");
        var commands = [];
        var sequences = d.match(sequenceRegEx);
        var complete = false;
        var coords = d.match(coordsRegEx);
        var first = {
          x: 0, y: 0
        }
        var previous = {
          x: 0, y: 0
        }

        if(coords[0] === coords[coords.length - 2] && coords[1] === coords[coords.length - 1]) {
          complete = true;
        }

        sequences.forEach(sequence => {
          sequence = sequence.trim();

          var code = sequence.match(codeRegEx);
          var coords = sequence.match(coordsRegEx);

          if(code[0] === "M") {
            var command = {
              code: code[0],
              d: randomiseCoords(
                parseInt(coords[0]),
                parseInt(coords[1]),
                options.drift
              )
            }
            first.x = parseInt(coords[0]);
            first.y = parseInt(coords[1]);
            previous.x = parseInt(coords[0]);
            previous.y = parseInt(coords[1]);
          }

          if(code[0] === "H") {
            var command = {
              code: code[0],
              d: randomiseCoords(
                parseInt(coords[0]),
                previous.y,
                options.drift
              )
            }
            previous.x = parseInt(coords[0]);
          }

          if(code[0] === "V") {
            var command = {
              code: code[0],
              d: randomiseCoords(
                previous.x,
                parseInt(coords[0]),
                options.drift
              )
            }
            previous.y = parseInt(coords[0]);
          }

          if(code[0] === "L") {
            var command = {
              d: randomiseCoords(
                parseInt(coords[0]),
                parseInt(coords[1]),
                options.drift
              )
            }
            previous.x = parseInt(coords[0]);
            previous.y = parseInt(coords[1]);
          }

          if(code[0] === "C") {
            var command = {
              code: code[0],
              d1: randomiseCoords(
                parseInt(coords[0]),
                parseInt(coords[1]),
                options.drift
              ),
              d2: randomiseCoords(
                parseInt(coords[2]),
                parseInt(coords[3]),
                options.drift
              ),
              d: randomiseCoords( 
                parseInt(coords[4]),
                parseInt(coords[5]),
                options.drift
              )
            }
            previous.x = parseInt(coords[4]);
            previous.y = parseInt(coords[5]);
          }

          if(code[0] === "Z") {
            // var command = {
            //   code: code[0]
            // }
            var command = {
              code: "L",
              d: randomiseCoords(
                first.x,
                first.y,
                options.drift
              )
            }
          }
          commands.push(command);
        });

        if(complete === true) {
          var lastIndex = commands.map(command => command.code === "C").lastIndexOf(true);
          commands[lastIndex].d = commands[0].d;
        }

        var fill = getColour('fill');
        var stroke = getColour('stroke');

        paths.push({
          circuit: circuit,
          commands: commands,
          complete: complete,
          fill: fill,
          stroke: stroke
        });
      };
    }

    function modifyLightness(hsl, modifier) {
      let sep = hsl.indexOf(",") > -1 ? "," : " ";
      hsl = hsl.substr(4).split(")")[0].split(sep);
      var lightness = modifier + parseInt(hsl[2].replace('%',''));
      return "hsl(" + hsl[0] + "," + hsl[1] + "," + lightness + "%)";
    }

    function shadingCoords(number, offset) {
      return offset + number;
    }

    function walkDOM(node,func) {
      func(node);
      node = node.firstChild;
      while(node) {
        walkDOM(node,func);
        node = node.nextSibling;
      }
    }

    function getTagNameResults(domElement, tagName) {
      var results = [];
      walkDOM(domElement, function(node) {
        if (node.tagName === tagName) {
          results.push(node);
        }
      });
      return results;
    }

    function randomiseCoords(x, y, mutation) {
      var angle = Math.random() * Math.PI * 2;
      var nX = Math.cos(angle) * mutation / 2;
      var nY = Math.sin(angle) * mutation / 2;
      return {
        x: Math.round(x + nX), y: Math.round(y + nY)
      }
    }

    function getColour(key) {
      var colour;
      if(!Array.isArray(options.palette[key])) {
        colour = options.palette[key];
      } else if(options.palette[key].length) {
        var rand = Math.floor(Math.random() * options.palette[key].length);
        colour = options.palette[key][rand];
      } else if(domPaths[i].getAttribute(key)) {
        colour = domPaths[i].getAttribute(key)
      } else {
        colour = 'black';
      }
      return colourAsHSL(colour);
    }

    function colourAsHSL(colour) {
      if(colour === 'transparent') {
        return colour;
      }
      if(hexRegEx.test(colour) === false && rgbRegEx.test(colour) === false) {
        colour = nametoHex(colour);
      }
      if(hexRegEx.test(colour)) {
        colour = hexToHsl(colour);
      }
      if(rgbRegEx.test(colour)) {
        colour = rgbToHsl(colour);
      }
      return colour;
    }

    // https://css-tricks.com/converting-color-spaces-in-javascript/
    function nametoHex(name)
    {
      var colours = {
        "aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff","beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887","cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff","darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f","darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1","darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff","firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff","gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f","honeydew":"#f0fff0","hotpink":"#ff69b4","indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c","lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2","lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de","lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6","magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee","mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5","navajowhite":"#ffdead","navy":"#000080","oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6","palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080","rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1","saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4","tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0","violet":"#ee82ee","wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5","yellow":"#ffff00","yellowgreen":"#9acd32"
      };
  
      if (typeof colours[name] !== 'undefined')
        return colours[name.toLowerCase()];
  
      return false;
    }

    function hexToHsl(H) {
      // Convert hex to RGB first
      let r = 0, g = 0, b = 0;
      if (H.length == 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
      } else if (H.length == 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
      }
      // Then to HSL
      r /= 255;
      g /= 255;
      b /= 255;
      let cmin = Math.min(r,g,b),
          cmax = Math.max(r,g,b),
          delta = cmax - cmin,
          h = 0,
          s = 0,
          l = 0;

      if (delta == 0)
        h = 0;
      else if (cmax == r)
        h = ((g - b) / delta) % 6;
      else if (cmax == g)
        h = (b - r) / delta + 2;
      else
        h = (r - g) / delta + 4;

      h = Math.round(h * 60);

      if (h < 0)
        h += 360;

      l = (cmax + cmin) / 2;
      s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
      s = +(s * 100).toFixed(1);
      l = +(l * 100).toFixed(1);

      return "hsl(" + h + "," + s + "%," + l + "%)";
    }

    function rgbToHsl(rgb) {
      let sep = rgb.indexOf(",") > -1 ? "," : " ";
      rgb = rgb.substr(4).split(")")[0].split(sep);
    
      for (let R in rgb) {
        let r = rgb[R];
        if (r.indexOf("%") > -1)
          rgb[R] = Math.round(r.substr(0,r.length - 1) / 100 * 255);
      }
    
      // Make r, g, and b fractions of 1
      let r = rgb[0] / 255,
          g = rgb[1] / 255,
          b = rgb[2] / 255;

      // Find greatest and smallest channel values
      let cmin = Math.min(r,g,b),
          cmax = Math.max(r,g,b),
          delta = cmax - cmin,
          h = 0,
          s = 0,
          l = 0;

      // Calculate hue
      // No difference
      if (delta == 0)
        h = 0;
      // Red is max
      else if (cmax == r)
        h = ((g - b) / delta) % 6;
      // Green is max
      else if (cmax == g)
        h = (b - r) / delta + 2;
      // Blue is max
      else
        h = (r - g) / delta + 4;

      h = Math.round(h * 60);
        
      // Make negative hues positive behind 360°
      if (h < 0)
          h += 360;

      // Calculate lightness
      l = (cmax + cmin) / 2;

      // Calculate saturation
      s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        
      // Multiply l and s by 100
      s = +(s * 100).toFixed(1);
      l = +(l * 100).toFixed(1);

      return "hsl(" + h + "," + s + "%," + l + "%)";
    }

  });
}
