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
        let spinner = ora('Compilando projeto...').start();
        let firstMessage = setTimeout(() => {
            spinner.color = 'yellow';
            spinner.text = 'Aguarde, isso pode levar alguns minutos...';
        }, 7000);
        let secondaryMessage = setTimeout(() => {
            spinner.color = 'green';
            spinner.text = 'Que tal tomar um café enquanto isso...';
        }, 20000);
        util.build(true)
            .then(resp => {
                clearTimeout(firstMessage);
                clearTimeout(secondaryMessage);
                spinner.succeed(`Compilado com sucesso.`);
                execute();
            }, err => {
                spinner.fail(`Problemas ao compilar seu projeto. \n ${error}`);
            });
    }
}

const execute = () => {
    let spinner = ora('Back-end sendo executado...').start();
    let projectInfo = util.getProjectInfo();
    let base = projectInfo.presentationMode == 'WEBPACK' ? `${projectInfo.artifactId}-presentation-webpack` : `${projectInfo.artifactId}-presentation`;


    exec(`java -jar ${projectInfo.artifactId}-boot/target/${projectInfo.artifactId}-boot.jar`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
        if (error !== null) {
            spinner.fail(`Falha ao executar back-end. \n ${error}`);
        } else {
            spinner.succeed(`Back-end executado.`);
            spinner = ora('Front-end em execução...').start();
            exec(`cd ${base}/src/main/webapp && npm run dev`, { maxBuffer: Infinity }, function (error, stdout, stderr) {
                if (error !== null) {
                    spinner.fail(`Falha ao executar front-end. \n ${error}`);
                } else {
                    spinner.succeed(`Front-end executado.`);
                }
            });

        }
    });
}