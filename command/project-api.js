const util = require('./common/util');
const ora = require('ora');
const exec = require('child_process').exec;
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');


const projectAPI = {
    run: function (args, options, logger) {
        if (!util.directoryIsProjectGG()) {
            ora('API').start().fail(`Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.`);
            return;
        }
        if (args.entityName) {
            let dirModel = util.getModelDir() + `/${util.upperFirstLetter(args.entityName)}.java`
            if (fs.existsSync(dirModel)) {
                let projectInfo = util.getProjectInfo();
                let packageEntity = `${projectInfo.groupId}.${projectInfo.artifactId}.domain.model.${util.upperFirstLetter(args.entityName)}`;
                projectAPI.generateAPIByEntity(packageEntity, `${util.upperFirstLetter(args.entityName)}`);
            } else {
                projectAPI.initQuestions(args, options, logger);
            }
        } else {
            projectAPI.initQuestions(args, options, logger);
        }
    },
    initQuestions: () => {
        let modelDir = util.getModelDir();
        if (!fs.existsSync(modelDir)) {
            ora('API').start().fail(`Antes de criar uma api é necessário criar uma entidade.`);
        } else {
            let files = util.findFilesInDir(modelDir, '.java');
            let preCommand = {
                type: 'list',
                message: 'Deseja gerar a API de qual entidade?',
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
                projectAPI.generateAPIByEntity(packageEntity, answers.choice);
            });
        }
    },
    generateAPIByEntity(entityPackage, entityName, callback) {
        let dirAPI = util.getApiDir().concat(`/${util.upperFirstLetter(entityName)}API.java`);
        if (fs.existsSync(dirAPI)) {
            ora('API').start().fail(`API não foi gerada, já existe esse arquivo criado.`);
        } else {
            const spinner = ora('Aguarde, executando: mvn clean install').start();
            util.buildDomain().then(resp => {
                spinner.color = 'green';
                spinner.text = 'Criando API...';
                let project = util.getProjectInfo();
                exec(`cd ${project.artifactId}-api && mvn io.gumga:gumgag:api -Dentidade=${entityPackage}`, { maxBuffer: Infinity },
                    function (error, stdout, stderr) {
                        if (error !== null) {
                            spinner.fail(`Problemas ao gerar API. \n ${error}`);
                            if (callback) callback(error);
                        } else {
                            spinner.succeed(`API foi gerada.`);
                            if (callback) callback(stdout);
                        }
                    });
            }, err => {
                spinner.fail(`Problemas ao gerar API. \n ${err}`);
            })
        }
    }
};

module.exports = projectAPI;