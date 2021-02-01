var ncp = require('ncp').ncp;

const srcDir = [];
const destDir = [];


ncp.limit = 16;

for (var i = 0; i < srcDir.length; i++) {
  console.log(srcDir[i] + ' to ' + destDir[i]);
  ncp(srcDir[i], destDir[i], function (err) {
    if (err) {
      return console.error(err);
    }
  });
}
