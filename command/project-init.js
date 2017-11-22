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
                message: 'Nome do artefato..: ',
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
                message: 'Nome do grupo..: ',
                default: 'br.com',
                name: 'groupId'
            });
        }
        if(!args.version) {
            questions.push({
                type: 'input',
                message: 'Versão..: ',
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
            answers.artifactId = util.lowerFirstLetter(answers.artifactId);
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
    fs.rename(`./${answers.artifactId}/mudar_para_.gitignore`, `${answers.artifactId}/.gitignore`, function(err) {});
}

const afterProjectGenerate = (projectLoader, answersProject) => {
    projectLoader.succeed(`O seu incrível projeto(${answersProject.artifactId}) foi gerado.`);
    createGumgaFile(answersProject);
}

const createGumgaFile = (answersProject) => {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'move',
            message: `Você deseja configurar um banco de dados?`
        }
    ]).then(answersMoveFile => {
        if(answersMoveFile.move){
            //create folder gumgafiles if not exists
            if(!fs.existsSync(util.getGumgaFilesDir())) fs.mkdirSync(util.getGumgaFilesDir());
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
                        configureDataBaseGumgaFile(answersProject);
                    }else{
                        finalizeMessage();
                    }
                })
            }else{
                configureDataBaseGumgaFile(answersProject);
            }
        }else{
            finalizeMessage();
        }
    });
}

const configureDataBaseGumgaFile = (answersProject) => {
    getInstalledPath('gumga-cli').then(pathCli => {
        let properties = fs.readFileSync(`${pathCli}/template.properties`, `utf8`);
        
        inquirer.prompt([
            {
                type: 'list',
                message: 'Qual banco de dados você utiliza?',
                name: 'name',
                default: 1,
                choices: [
                    {
                        name: 'MySQL',
                        value: 'MYSQL'
                    },
                    {
                        name: 'PostgreSQL',
                        value: 'POSTGRES'
                    }
                ]
            }
        ]).then(answersDatabase => {
            let typeDatabase = answersDatabase.name;
            inquirer.prompt([
                {
                    type: 'input',
                    message: 'Endereço do servidor..: ',
                    name: 'host',
                    default: 'localhost'
                },
                {
                    type: 'input',
                    message: 'Porta..: ',
                    name: 'port',
                    default: typeDatabase == 'MYSQL' ? 3306 : typeDatabase == 'POSTGRES' ? 5432 : 1000,
                    validate: function(input){
                        let done = this.async();
                        if(!Number.isInteger(input)){
                            done('Por favor, informe uma porta válida.');
                            return;
                        }
                        done(null, true);
                    }
                },
                {
                    type: 'input',
                    message: 'Nome da base de dados..: ',
                    default: answersProject.artifactId,
                    name: 'database',
                    validate: function(input){
                        let done = this.async();
                        if(!input){
                            done('Por favor, preencha o nome da base de dados.');
                            return;
                        }
                        done(null, true);
                    }
                },
                {
                    type: 'input',
                    message: 'Usuário do banco..: ',
                    default: answersProject.artifactId,
                    name: 'user',
                    validate: function(input){
                        let done = this.async();
                        if(!input){
                            done('Por favor, preencha o nome do usuário.');
                            return;
                        }
                        done(null, true);
                    }
                },
                {
                    type: 'input',
                    message: 'Senha..: ',
                    default: answersProject.artifactId,
                    name: 'password'
                }
            ]).then(answers => {
                properties = util.replaceAll(properties, 'GUMGA_DB_NAME', typeDatabase);
                properties = util.replaceAll(properties, 'GUMGA_USER', answers.user);
                properties = util.replaceAll(properties, 'GUMGA_PASSWORD', answers.password);
                switch(typeDatabase){
                    case 'MYSQL':
                        properties = util.replaceAll(properties, 'GUMGA_URL', `jdbc:mysql://${answers.host}:${answers.port}/${answers.database}?zeroDateTimeBehavior=convertToNull&useUnicode=yes&characterEncoding=utf8&createDatabaseIfNotExist=true`);
                        properties = util.replaceAll(properties, 'GUMGA_CLASS_NAME', 'com.mysql.jdbc.jdbc2.optional.MysqlDataSource');
                        properties = util.replaceAll(properties, 'GUMGA_DIALECT', 'org.hibernate.dialect.MySQL5Dialect');                        
                        break;
                    case 'POSTGRES':
                        properties = util.replaceAll(properties, 'GUMGA_URL', `jdbc:postgresql://${answers.host}:${answers.port}/${answers.database}?createDatabaseIfNotExist=true`);
                        properties = util.replaceAll(properties, 'GUMGA_CLASS_NAME', 'org.postgresql.jdbc2.optional.SimpleDataSource');
                        properties = util.replaceAll(properties, 'GUMGA_DIALECT', 'org.hibernate.dialect.PostgreSQLDialect');
                        break;
                }
                configureSecurityGumgFile(properties, answersProject);
            })
        })

    });
}

const configureSecurityGumgFile = (properties, answersProject) => {
    inquirer.prompt([
        {
            type: 'confirm',
            name: 'usage',
            message: `Você utiliza o segurança?`
        }
    ]).then(resp => {
        if(resp.usage){
            inquirer.prompt([
                {
                    type: 'input',
                    message: 'Qual o endereço do segurança..: ',
                    name: 'security',
                    default: 'https://www.gumga.io'
                },
            ]).then(answers => {
                properties = util.replaceAll(properties, 'GUMGA_SECURITY', answers.security);
                createFileProperties(properties, answersProject);
                finalizeMessage();
            });
        }else{
            createFileProperties(properties, answersProject);
            finalizeMessage();
        }
    })
}

const createFileProperties = (str, answersProject) => {
    let dir = util.getGumgaFilesDir().concat(`/${answersProject.artifactId}.properties`);
    fs.writeFile(dir, str, function(err) {}); 
}

const finalizeMessage = () => {
    const spinner = ora('Aguarde...').start();
    spinner.succeed('Pronto, tudo certo!');
}
