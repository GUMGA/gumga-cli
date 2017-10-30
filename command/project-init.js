const inquirer = require('inquirer');
const exec = require('child_process').exec;
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const { getInstalledPath } = require('get-installed-path');
const util = require('./common/util');

module.exports = {
    run: function(args, options, logger){
        let questions = [];
        if(!args.artifactId) {
            questions.push({
                type: 'input',
                message: 'Nome do artefato',
                default: 'exemplo',
                name: 'artifactId',
            });
        }
        if(!args.groupId) {
            questions.push({
                type: 'input',
                message: 'Nome do grupo',
                default: 'br.com',
                name: 'groupId',
            });
        }
        if(!args.version) {
            questions.push({
                type: 'input',
                message: 'Versão',
                default: '1.0.0',
                name: 'version',
            });
        }
        questions.push({
            type: 'list',
            message: 'Qual a tecnologia front-end você deseja usar?',
            name: 'presentationMode',
            default: 1,
            choices: [
              {
                name: 'Angular 1 - RequireJs',
                value: 1
              },
              {
                name: 'Angular 1 - Webpack',
                value: 2
              },  
              {
                name: 'Angular 4',
                value: 3
              }
            ]
          });
        inquirer.prompt(questions).then(function (answers) {
            answers.artifactId = answers.artifactId || args.artifactId;
            answers.groupId = answers.groupId || args.groupId;
            answers.version = answers.version || args.version;
            const spinner = ora('Gerando o projeto').start();
            const command = `mvn archetype:generate -DinteractiveMode=false -DarchetypeGroupId=io.gumga -DarchetypeArtifactId=gumga-archetype -DarchetypeVersion=LATEST -DgroupId=${answers.groupId} -DartifactId=${answers.artifactId} -Dversion=${answers.version}`;
            exec(command, {maxBuffer: 1024 * 1024}, function (error, stdout, stderr) {                
                if (error !== null) {
                    spinner.fail(`Problemas ao gerar o projeto(${answers.artifactId}) \n ${error}`);            
                } else {
                    handlingFolders(answers, spinner);
                }                    
            });
        });
    }
}

const handlingFolders = (answers, projectLoader) => {
    try{
        let dirPresentation = `${answers.artifactId}/${answers.artifactId}-presentation`;
        switch(answers.presentationMode) {
            //CASO FOR GERAR EM REQUIREJS
            case 1:
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation-webpack<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(`${dirPresentation}-webpack`);
                projectLoader.succeed(`O seu incrível projeto(${answers.artifactId}) foi gerado.`);
            break;
            //CASO FOR GERAR EM WEBPACK
            case 2:    
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(dirPresentation);
                projectLoader.succeed(`O seu incrível projeto(${answers.artifactId}) foi gerado.`);
            break;
            //CASO FOR GERAR EM ANGULAR 4
            case 3:
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation-webpack<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(`${dirPresentation}-webpack`);
                util.deleteFolderRecursive(`${dirPresentation}/src/main/webapp`);
    
                const command = `cd ${dirPresentation}/src/main && ng new ${answers.artifactId} --skip-install`;
                exec(command, {maxBuffer: 1024 * 1024}, function (error, stdout, stderr) {
                    if (error !== null) {
                        projectLoader.fail(`Problemas ao gerar o projeto(${answers.artifactId}) \n ${error}`);  
                    } else {                    
                        fs.rename(`${dirPresentation}/src/main/${answers.artifactId}`, `${dirPresentation}/src/main/webapp`, function (err) {
                            if (err) {
                                projectLoader.fail(`Problemas ao gerar o projeto(${answers.artifactId}) \n ${error}`);           
                            } else {
                                util.replaceFiles(/bower|Bower/g, 'npm', [`${dirPresentation}/pom.xml`]);
                                getInstalledPath('gumga-cli').then(function(pt){
                                    util.copyRecursiveSync(`${pt}/template-presentation/module/META-INF`, `${dirPresentation}/src/main/webapp/META-INF`);
                                    util.copyRecursiveSync(`${pt}/template-presentation/module/WEB-INF`, `${dirPresentation}/src/main/webapp/WEB-INF`);
                                    projectLoader.succeed(`O seu incrível projeto(${answers.artifactId}) foi gerado.`);
                                });
                            }                        
                        });
                    }
                });
    
            break;
        }
    }catch(e){
        util.deleteFolderRecursive(`${answers.artifactId}`);
    }
}