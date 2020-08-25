# Remnant

`Remnant` is a node.js module for turning inline SVG images into garbled up animations.

### How

`npm install remnant --save`

```javascript
var Remnant = require('remnant');

remnant('#something');
// hides the #something element, replaces it with a remnant
```

Here are all of the options, described in detail below.

```javascript
var Remnant = require('remnant');

remnant('#something', {
    // Thickness of the line in pixels
    thickness: 8,
    // How far off the original path the lines are
    drift: 14,
    // Number of times the outline is drawn
    circuits: 2,
    // Colours to use and where to use them
    palette: {
      background: ['white', '#ffcc00'],
      stroke: 'black',
      fill: ['transparent', 'blue', '#ff4400']
    },
    // Animation frames per second
    refresh: 24,
    // Additional classes
    class: 'merlin'
});
```

-----------

`Remnant` was created by and is maintained by [Thom Vincent](https://github.com/gdaythom).
