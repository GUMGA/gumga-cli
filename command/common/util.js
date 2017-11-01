const fs = require('fs');
const path = require('path');
const replace = require("replace");
const userHome = require('user-home');

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
    replaceAll: (str, search, replacement) => {
        return str.replace(new RegExp(search, 'g'), replacement);
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
    },
    getGumgaFilesDir: () => {
        return userHome.concat('/gumgafiles');
    },
    testApplicationInstalled: (app, textToFind, callback) => {
        require('child_process').exec(`${app} -version`, {maxBuffer: Infinity}, function (error, stdout, stderr) {
            if (error !== null) {
                callback(false);
            } else {
                let str = stderr || stdout;
                data = str.toString().split('\n')[0];
                let appVersion = new RegExp(textToFind).test(data) ? true : false;
                callback(appVersion != false);
            }
        });
    }
}

module.exports = util;



