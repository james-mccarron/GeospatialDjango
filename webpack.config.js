const path = require('path');

module.exports = {
  
  entry: './static/mapproject/js/main.js', // Your entry point
  output: {
    filename: 'bundle.js', // Output filename
    path: path.resolve(__dirname, 'static/mapproject/dist'), // Output directory
  },
};