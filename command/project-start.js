const inquirer = require('inquirer');
const exec = require('child_process').exec;
const ora = require('ora');
const util = require('./common/util');

module.exports = {
    run: function (args, options, logger) {
        if (!util.directoryIsProjectGG()) {
            ora('FRONT').start().fail(`Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.`);
            return;
        }

        if (args.module) {
            execute(args);
        } else {
            inquirer.prompt({
                type: 'list',
                message: 'Qual módulo deseja executar?',
                name: 'module',
                choices: [
                    {
                        name: 'Front-end',
                        value: 'front'
                    },
                    {
                        name: 'Back-end',
                        value: 'back'
                    }
                ]
            }).then(result => {
                args.module = result.module;
                execute(args);
            });
        }
    }
}

const execute = (args) => {
    switch (args.module) {
        case 'front':
            executeFront();
            break;
        case 'back':
            executeBack();
            break;
    }
}

const executeBack = () => {
    let projectInfo = util.getProjectInfo();
    var process = exec(`java -jar ${projectInfo.artifactId}-boot/target/${projectInfo.artifactId}-boot.jar`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
        if (error !== null) {
            ora('Back-end em execução...').start().fail(`Falha ao executar back-end. \n ${error}`);
        }
    });
    process.stdout.on('data', function(data) {
        console.log(data); 
    });
}

const executeFront = () => {
    let projectInfo = util.getProjectInfo();
    let base = projectInfo.presentationMode == 'WEBPACK' ? `${projectInfo.artifactId}-presentation-webpack` : `${projectInfo.artifactId}-presentation`;
    var process = exec(`cd ${base}/src/main/webapp && npm run dev`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
        if (error !== null) {
            ora('Front-end em execução...').start().fail(`Falha ao executar front-end. \n ${error}`);
        }
    });
    process.stdout.on('data', function(data) {
        console.log(data); 
    });
}