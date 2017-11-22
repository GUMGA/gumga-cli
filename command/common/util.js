const fs = require('fs');
const path = require('path');
const replace = require("replace");
const userHome = require('user-home');
const exec = require('child_process').exec;

var util = {
    GG_FILE_CONFIG_NAME: 'gg.config.json',

    deleteFolderRecursive: (path) => {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file, index) {
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
    buildDomain: () => {
        let project = util.getProjectInfo();
        return new Promise((resp, rej) => {
            exec(`cd ${project.artifactId}-domain && mvn clean install`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
                if (error !== null) {
                    rej(error);
                } else {
                    resp(stdout);
                }
            });
        })
    },
    findFilesInDir: (startPath, filter) => {
        let results = [];
        if (!fs.existsSync(startPath)) {
            console.log("no dir ", startPath);
            return;
        }
        let files = fs.readdirSync(startPath);
        for (let i = 0; i < files.length; i++) {
            let filename = path.join(startPath, files[i]);
            let stat = fs.lstatSync(filename);
            if (stat.isDirectory()) {
                results = results.concat(findFilesInDir(filename, filter));
            }
            else if (filename.indexOf(filter) >= 0) {
                results.push(filename);
            }
        }
        return results;
    },
    copyRecursiveSync: (src, dest) => {
        var exists = fs.existsSync(src);
        var stats = exists && fs.statSync(src);
        var isDirectory = exists && stats.isDirectory();
        if (exists && isDirectory) {
            fs.mkdirSync(dest);
            fs.readdirSync(src).forEach(function (childItemName) {
                util.copyRecursiveSync(path.join(src, childItemName),
                    path.join(dest, childItemName));
            });
        } else {
            fs.linkSync(src, dest);
        }
    },
    replaceAll: (str, search, replacement) => {
        return str.split(search).join(replacement);
    },
    getModelDir: () => {
        let projectInfo = util.getProjectInfo();
        return process.cwd() + `/${projectInfo.artifactId}-domain/src/main/java/${util.replaceAll(projectInfo.groupId, '.', '/')}/${projectInfo.artifactId}/domain/model`;
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
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    },
    directoryIsProjectGG: () => {
        return fs.existsSync('./'.concat(util.GG_FILE_CONFIG_NAME));
    },
    getProjectInfo: () => {
        return require(process.cwd().concat(`/${util.GG_FILE_CONFIG_NAME}`));
    },
    upperFirstLetter: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    lowerFirstLetter: (str) => {
        return str.charAt(0).toLowerCase() + str.slice(1);
    },
    getGumgaFilesDir: () => {
        return userHome.concat('/gumgafiles');
    },
    testApplicationInstalled: (app, textToFind, callback) => {
        require('child_process').exec(`${app} -version`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
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



