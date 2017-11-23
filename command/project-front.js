const util = require('./common/util');
const ora = require('ora');
const exec = require('child_process').exec;
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');


const projectFRONT = {
    run: function (args, options, logger) {
        if (!util.directoryIsProjectGG()) {
            ora('FRONT').start().fail(`Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.`);
            return;
        }
        if (args.entityName) {
            let dirModel = util.getModelDir() + `/${util.upperFirstLetter(args.entityName)}.java`
            if (fs.existsSync(dirModel)) {
                let projectInfo = util.getProjectInfo();
                let packageEntity = `${projectInfo.groupId}.${projectInfo.artifactId}.domain.model.${util.upperFirstLetter(args.entityName)}`;
                projectFRONT.generateFrontByEntity(packageEntity, `${util.upperFirstLetter(args.entityName)}`);
            } else {
                projectFRONT.initQuestions(args, options, logger);
            }
        } else {
            projectFRONT.initQuestions(args, options, logger);
        }
    },
    initQuestions: () => {
        let modelDir = util.getModelDir();
        if (!fs.existsSync(modelDir)) {
            ora('FRONT').start().fail(`Antes de criar um modulo front-end é necessário criar uma entidade.`);
        } else {
            let files = util.findFilesInDir(modelDir, '.java');
            let preCommand = {
                type: 'list',
                message: 'Deseja gerar o front-end de qual entidade?',
                name: 'choice',
                default: 1,
                choices: []
            }
            files.forEach(file => {
                let filename = path.basename(file).replace(path.extname(file), '');
                preCommand.choices.push({
                    name: filename,
                    value: filename
                })
            });
            inquirer.prompt(preCommand).then(answers => {
                let projectInfo = util.getProjectInfo();
                let packageEntity = `${projectInfo.groupId}.${projectInfo.artifactId}.domain.model.${answers.choice}`;
                projectFRONT.generateFrontByEntity(packageEntity, answers.choice);
            });
        }
    },
    generateFrontByEntity(entityPackage, entityName, callback) {
        let dirFRONT = util.getPresentationDir().concat(`/${entityName.toLowerCase()}`);
        if (fs.existsSync(dirFRONT)) {
            ora('FRONT').start().fail(`Front-end não foi gerado, já existe o módulo ${entityName.toLowerCase()} criado.`);
        } else {
            const spinner = ora('Aguarde, executando: mvn clean install').start();
            util.buildDomain().then(resp => {
                let projectInfo = util.getProjectInfo();
                spinner.color = 'green';
                spinner.text = 'Criando front-end...';
                let project = util.getProjectInfo();
                let base = projectInfo.presentationMode == 'WEBPACK' ? `${projectInfo.artifactId}-presentation-webpack` : `${projectInfo.artifactId}-presentation`;
                exec(`cd ${base} && mvn io.gumga:gumgag:apresentacao -Dentidade=${entityPackage}`, { maxBuffer: Infinity },
                    function (error, stdout, stderr) {
                        if (error !== null) {
                            spinner.fail(`Problemas ao gerar front-end. \n ${error}`);
                            if (callback) callback(error);
                        } else {
                            spinner.succeed(`Front-end foi gerado.`);
                            if (callback) callback(stdout);
                        }
                    });
            }, err => {
                spinner.fail(`Problemas ao gerar front-end. \n ${err}`);
            })
        }
    }
};

module.exports = projectFRONT;