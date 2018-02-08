const util = require('./common/util');
const ora = require('ora');
const exec = require('child_process').exec;
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');

const projectService = {
    run: function (args, options, logger) {
        if (!util.directoryIsProjectGG()) {
            logger.error('Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.');
            return;
        }
        if(args.entityName){
            let dirModel = util.getModelDir() + `/${util.upperFirstLetter(args.entityName)}.java`
            if(fs.existsSync(dirModel)){
                let projectInfo = util.getProjectInfo();
                let packageEntity = `${projectInfo.groupId}.${projectInfo.artifactId}.domain.model.${util.upperFirstLetter(args.entityName)}`;
                projectService.generateServiceByEntity(packageEntity, `${util.upperFirstLetter(args.entityName)}`);
            }else{
                projectService.initQuestions(args, options, logger);
            }
        }else{
            projectService.initQuestions(args, options, logger);
        }
    },
    initQuestions: () => {
        let modelDir = util.getModelDir();
        if (!fs.existsSync(modelDir)) {
            ora('API').start().fail(`Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.`);
        }else{
            let files = util.findFilesInDir(modelDir, '.java');
            let preCommand = {
                type: 'list',
                message: 'Deseja gerar a service e o repositório de qual entidade?',
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
                projectService.generateServiceByEntity(packageEntity, answers.choice);
            });
        }
    },
    generateServiceByEntity(entityPackage, entityName, callback) {
        let dirService = util.getApplicationDir().concat('/service/').concat(`${util.upperFirstLetter(entityName)}Service.java`);
        if(fs.existsSync(dirService)){
            ora('Service').start().fail(`Service e repositório não foi gerada, já existe esses arquivos criados.`);
        }else{
            const spinner = ora('Aguarde, executando: mvn clean install').start();
            util.buildDomain().then(resp => {
                spinner.color = 'green';
                spinner.text = 'Criando service e repositório...';
                let project = util.getProjectInfo();
                exec(`cd ${project.artifactId}-application && mvn io.gumga:gumgag:aplicacao -Dentidade=${entityPackage}`, { maxBuffer: Infinity },
                    function (error, stdout, stderr) {
                        if (error !== null) {
                            spinner.fail(`Problemas ao gerar service e repositório. \n ${error}`);
                            if(callback) callback(error);
                        } else {
                            spinner.succeed(`Service e repositório foram gerados.`);
                            if(callback) callback(stdout);
                        }
                    });
            }, err => {
                spinner.fail(`Problemas ao gerar service e repositório. \n ${err}`);
            })
        }
    }
};

module.exports = projectService;
