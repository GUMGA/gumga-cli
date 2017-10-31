const inquirer = require('inquirer');
const exec = require('child_process').exec;
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const { getInstalledPath } = require('get-installed-path');
const util = require('./common/util');
const opener = require("opener");

module.exports = {
    run: function(args, options, logger){
        if(util.directoryIsProjectGG()){
            logger.error('Você está em um diretório de um projeto existente, não é permitido a criação de outros projetos apartir desse diretório.');
            return;
        }
        let questions = [];
        if(!args.artifactId) {
            questions.push({
                type: 'input',
                message: 'Nome do artefato',
                default: 'exemplo',
                name: 'artifactId',
                validate: function(input){
                    let done = this.async();
                    if(!(/^[a-zA-Z0-9]+$/g.test(input))){
                        done('O nome do seu projeto não pode conter caracteres especiais.');
                        return;
                    }
                    if(fs.existsSync(input)){
                        done('Já existe uma pasta com esse nome no diretório atual, tente outro nome.');
                        return;
                    }else{
                        done(null, true);
                    }
                }
            });
        }
        if(!args.groupId) {
            questions.push({
                type: 'input',
                message: 'Nome do grupo',
                default: 'br.com',
                name: 'groupId'
            });
        }
        if(!args.version) {
            questions.push({
                type: 'input',
                message: 'Versão',
                default: '1.0.0',
                name: 'version'
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
                value: 'REQUIREJS'
              },
              {
                name: 'Angular 1 - Webpack',
                value: 'WEBPACK'
              },  
              {
                name: 'Angular 4',
                value: 'ANGULAR4'
              }
            ]
          });
        inquirer.prompt(questions).then(function (answers) {
            const spinner = ora('Gerando o projeto').start();
            if(fs.existsSync(answers.artifactId)){
                spinner.fail(`Não podemos criar seu projeto, já existe uma pasta com o nome "${answers.artifactId}" no diretório atual.`);      
                return;
            }
            answers.artifactId = answers.artifactId || args.artifactId;
            answers.groupId = answers.groupId || args.groupId;
            answers.version = answers.version || args.version;
            const command = `mvn archetype:generate -DinteractiveMode=false -DarchetypeGroupId=io.gumga -DarchetypeArtifactId=gumga-archetype -DarchetypeVersion=LATEST -DgroupId=${answers.groupId} -DartifactId=${answers.artifactId} -Dversion=${answers.version}`;
            exec(command, {maxBuffer: Infinity}, function (error, stdout, stderr) {     
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
            case 'REQUIREJS':
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation-webpack<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(`${dirPresentation}-webpack`);
                afterProjectGenerate(projectLoader, answers);
            break;
            //CASO FOR GERAR EM WEBPACK
            case 'WEBPACK':    
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(dirPresentation);
                afterProjectGenerate(projectLoader, answers);
            break;
            //CASO FOR GERAR EM ANGULAR 4
            case 'ANGULAR4':
                util.replaceFiles(new RegExp(`<module>${answers.artifactId}-presentation-webpack<\/module>`), '', [`${answers.artifactId}/pom.xml`]);
                util.deleteFolderRecursive(`${dirPresentation}-webpack`);
                util.deleteFolderRecursive(`${dirPresentation}/src/main/webapp`);
    
                const command = `cd ${dirPresentation}/src/main && ng new ${answers.artifactId} --skip-install`;
                exec(command, {maxBuffer: Infinity}, function (error, stdout, stderr) {
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
                                    afterProjectGenerate(projectLoader, answers);
                                });
                            }                        
                        });
                    }
                });
    
            break;
        }
        createGGFIle(answers);
        renameGithubFile(answers);
    }catch(e){
        util.deleteFolderRecursive(`${answers.artifactId}`);
    }
}

const createGGFIle = (answers) => {
    fs.writeFile(`${answers.artifactId}/${util.GG_FILE_CONFIG_NAME}`, JSON.stringify(answers), 'utf8', function (err) {});
}

const renameGithubFile = (answers) => {
    exec(`mv ${answers.artifactId}/mudar_para_.gitignore ${answers.artifactId}/.gitignore`, {maxBuffer: Infinity},  (error, stdout, stderr) => {});
}

const afterProjectGenerate = (projectLoader, answersProject) => {
    projectLoader.succeed(`O seu incrível projeto(${answersProject.artifactId}) foi gerado.`);
    handlingGumgaFile(answersProject);
}

const handlingGumgaFile = (answersProject) => {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'move',
            message: `Deseja mover o arquivo ${answersProject.artifactId}.properties para a pasta gumgafiles?`
        }
    ]).then(answersMoveFile => {
        if(answersMoveFile.move){
            let dir = util.getGumgaFilesDir().concat(`/${answersProject.artifactId}.properties`);
            if(fs.existsSync(dir)){
                inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'overwrite',
                        message: `Já existe um arquivo ${answersProject.artifactId}.properties na pasta ${util.getGumgaFilesDir()}, deseja sobrescrevê- lo?`
                    }
                ]).then(answersOverwriteFile => {
                    if(answersOverwriteFile.overwrite){
                        fs.unlinkSync(dir);
                        moveGumgaFile(answersProject);
                    }else{
                        finalizeMessage();
                    }
                })
            }else{
                moveGumgaFile(answersProject);
            }
        }else{
            finalizeMessage();
        }
    });
}

const moveGumgaFile = (answersProject) => {
    let dir = util.getGumgaFilesDir().concat(`/${answersProject.artifactId}.properties`);
    fs.createReadStream(`${answersProject.artifactId}/${answersProject.artifactId}.properties`)
    .pipe(fs.createWriteStream(dir));
    inquirer.prompt([
      {
          type: 'confirm',
          name: 'open',
          message: `Quer aproveitar e editar o arquivo ${answersProject.artifactId}.properties com suas configurações?`
      }
    ]).then(answersOpenFile => {
      if(answersOpenFile.open){
          opener(dir);
      }
      finalizeMessage();
    })
}

const finalizeMessage = () => {
    const spinner = ora('Aguarde...').start();
    spinner.succeed('Pronto, tudo certo!');
}
