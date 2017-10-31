const fs = require('fs');
const path = require('path');
const replace = require("replace");

var util = {
    GG_FILE_CONFIG_NAME : 'gg.config.json',

    deleteFolderRecursive: (path) => {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index){
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                util.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
            });
            fs.rmdirSync(path);
        }
    },
    copyRecursiveSync: (src, dest) => {
        var exists = fs.existsSync(src);
        var stats = exists && fs.statSync(src);
        var isDirectory = exists && stats.isDirectory();
        if (exists && isDirectory) {
            fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(function(childItemName) {
            util.copyRecursiveSync(path.join(src, childItemName),
                                path.join(dest, childItemName));
            });
        } else {
            fs.linkSync(src, dest);
        }
    },
    replaceFiles: (regex, value, files) => {
        replace({
            regex: regex,
            replacement: value,
            paths: files,
            recursive: true,
            silent: true
        });
    },
    createFolderIfNotExists: dir => {
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
    },
    directoryIsProjectGG : () => {
        return fs.existsSync('./'.concat(util.GG_FILE_CONFIG_NAME));
    }
}

module.exports = util;