const util = require('./common/util');
const ora = require('ora');
const exec = require('child_process').exec;
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const projectService = require('./project-service');
const projectAPI = require('./project-api');
const projectFRONT = require('./project-front');

module.exports = {
    run: function (args, options, logger) {
        if (!util.directoryIsProjectGG()) {
            logger.error('Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.');
            return;
        }

        let modelDir = util.getModelDir();

        if (args.entityName
            && fs.existsSync(modelDir)
            && util.findFilesInDir(modelDir, '.java').filter(file => path.basename(file).replace(path.extname(file), '') == util.upperFirstLetter(args.entityName)).length > 0) {
            logger.error('Já existe uma entidade com este nome, escolha outro.');
            args.entityName = null;
        }

        if (!args.entityName) {
            inquirer.prompt({
                type: 'input',
                message: 'Nome da entidade..: ',
                name: 'entityName',
                validate: function (input) {
                    let done = this.async();
                    if (!input) {
                        done('Informe o nome da entidade.');
                        return;
                    }
                    if (input.indexOf(' ') > 0) {
                        done('Por favor, não utilize espaços.');
                        return;
                    }
                    let modelDir = util.getModelDir();
                    if (fs.existsSync(modelDir)) {
                        let existsEntity = util.findFilesInDir(modelDir, '.java').filter(file => path.basename(file).replace(path.extname(file), '') == util.upperFirstLetter(input)).length > 0;
                        if (existsEntity) {
                            done('Já existe uma entidade com este nome, escolha outro.');
                        } else {
                            done(null, true);
                        }
                    } else {
                        done(null, true);
                    }
                }
            }).then(answers => startEntity(answers));
        } else {
            startEntity(args);
        }

    }
}

const startEntity = (args) => {
    let projectInfo = util.getProjectInfo(), questions = [];
    let packageEntity = `${projectInfo.groupId}.${projectInfo.artifactId}.domain.model.${util.upperFirstLetter(args.entityName)}`;
    getExtends(projectInfo, entityExtends => {
        getAttributes(``, projectInfo, entityExtends, attributes => {
            createEntity(args, projectInfo, packageEntity, entityExtends, attributes.slice(0, -1));
        });
    })
}

const getExtends = (projectInfo, callback) => {
    let modelDir = util.getModelDir();
    if (!fs.existsSync(modelDir) || util.findFilesInDir(modelDir, '.java').length == 0) {
        callback(``);
        return;
    }
    inquirer.prompt({
        type: 'confirm',
        name: 'isExtends',
        default: false,
        message: `Sua entidade possui herança?`
    }).then(questions => {
        if (!questions.isExtends) {
            callback(``);
            return;
        }
        if (fs.existsSync(modelDir)) {
            let files = util.findFilesInDir(modelDir, '.java');
            let preCommand = {
                type: 'list',
                message: 'Deseja herdar de qual entidade?',
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
                callback(`-Dsuper=${answers.choice}`);
            });
        } else {
            callback(``);
        }
    })

}

const getAttributes = (attributes, projectInfo, entityExtends, callback, otherField) => {
    let message = otherField ? `Quer criar outro campo ou associação?` : `Deseja criar um campo ou uma associação?`;
    inquirer.prompt({
        type: 'confirm',
        name: 'generatorFields',
        default: entityExtends.trim() == '',
        message: message
    }).then(questions => {
        if (!questions.generatorFields) {
            callback(attributes);
            return;
        }
        inquirer.prompt([
            {
                type: 'list',
                message: 'O que deseja fazer agora?',
                name: 'choice',
                default: 1,
                choices: [
                    {
                        name: '1 - Criar associação',
                        value: 'ASSOCIATION'
                    },
                    {
                        name: '2 - Criar campo',
                        value: 'FIELD'
                    }
                ]
            }
        ]).then(answers => {
            switch (answers.choice) {
                case 'FIELD':
                    generateField(attributes, (newattributes) => {
                        attributes = newattributes;
                        getAttributes(attributes, projectInfo, entityExtends, callback, true);
                    });
                    break;
                case 'ASSOCIATION':
                    generateAssociation(attributes, (newattributes) => {
                        attributes = newattributes;
                        getAttributes(attributes, projectInfo, entityExtends, callback, true);
                    });
                    break;
            }
        })
    })
}

const generateAssociation = (attributes, callback) => {
    let modelDir = util.getModelDir();
    if (fs.existsSync(modelDir)) {
        let files = util.findFilesInDir(modelDir, '.java');
        if (files.length == 0) {
            console.error('Não encontramos outras entidades para fazer uma associação');
            callback(attributes);
            return;
        }
        let preCommand = {
            type: 'list',
            message: 'Deseja fazer associação com qual entidade?',
            name: 'association',
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
        inquirer.prompt([
            preCommand,
            {
                type: 'list',
                message: 'Qual o tipo da associação?',
                name: 'type',
                default: 1,
                choices: [
                    {
                        name: '1 - ManyToOne',
                        value: 'ManyToOne',
                    },
                    {
                        name: '2 - ManyToMany',
                        value: 'ManyToMany',
                    },
                    {
                        name: '3 - OneToOne',
                        value: 'OneToOne',
                    },
                    {
                        name: '4 - OneToMany',
                        value: 'OneToMany',
                    }
                ]
            }
        ]).then(answers => {
            let sugestAttributeName = answers.type.endsWith('Many') ? util.lowerFirstLetter(answers.association).concat('s') : util.lowerFirstLetter(answers.association);
            inquirer.prompt({
                type: 'input',
                message: 'Nome da associação..: ',
                default: sugestAttributeName,
                name: 'name',
                validate: function (input) {
                    let done = this.async();
                    if (!input) {
                        done('Informe o nome da associação.');
                        return;
                    }
                    if (input.indexOf(' ') > 0) {
                        done('Por favor, não utilize espaços.');
                        return;
                    }
                    done(null, true);
                }
            }).then(answersName => {
                ora('Adicionando associação').start().succeed(`Associação com ${answers.association} foi criada.`);
                if (answers.type.endsWith('Many')) {
                    attributes = attributes.concat(`${answersName.name}:List<${answers.association}>:@${answers.type},`);
                } else {
                    attributes = attributes.concat(`${answersName.name}:${answers.association}:@${answers.type},`);
                }
                callback(attributes);
            })
        });
    } else {
        console.error('Não encontramos outras entidades para fazer uma associação');
        callback(attributes);
        return;
    }
}

const generateField = (attributes, callback) => {
    inquirer.prompt([
        {
            type: 'input',
            message: 'Nome da campo..: ',
            name: 'fieldName',
            validate: function (input) {
                let done = this.async();
                if (!input) {
                    done('Informe o nome do campo.');
                    return;
                }
                if (input.indexOf(' ') > 0) {
                    done('Por favor, não utilize espaços.');
                    return;
                }
                done(null, true);
            }
        }, {
            type: 'list',
            message: 'Qual tipo do campo?',
            name: 'fieldType',
            default: 1,
            choices: [
                {
                    name: '1 - String',
                    value: 'String'
                },
                {
                    name: '2 - Integer',
                    value: 'Integer'
                },
                {
                    name: '3 - Date',
                    value: 'Date'
                },
                {
                    name: '4 - Long',
                    value: 'Long'
                },
                {
                    name: '5 - BigDecimal',
                    value: 'BigDecimal'
                },
                {
                    name: '6 - GumgaAddress',
                    value: 'GumgaAddress'
                },
                {
                    name: '7 - GumgaBoolean',
                    value: 'GumgaBoolean'
                },
                {
                    name: '8 - GumgaBarCode',
                    value: 'GumgaBarCode'
                },
                {
                    name: '9 - GumgaCEP',
                    value: 'GumgaCEP'
                },
                {
                    name: '10 - GumgaCNPJ',
                    value: 'GumgaCNPJ'
                },
                {
                    name: '11 - GumgaCPF',
                    value: 'GumgaCPF'
                },
                {
                    name: '12 - GumgaEMail',
                    value: 'GumgaEMail'
                },
                {
                    name: '13 - GumgaImage',
                    value: 'GumgaImage'
                }, {
                    name: '14 - GumgaMoney',
                    value: 'GumgaMoney'
                },
                {
                    name: '15 - GumgaMultiLineString',
                    value: 'GumgaMultiLineString'
                },
                {
                    name: '16 - GumgaPhoneNumber',
                    value: 'GumgaPhoneNumber'
                },
                {
                    name: '17 - GumgaTime',
                    value: 'GumgaTime'
                },
                {
                    name: '18 - GumgaIP4',
                    value: 'GumgaIP4'
                },
                {
                    name: '19 - GumgaIP6',
                    value: 'GumgaIP6'
                },
                {
                    name: '20 - GumgaURL',
                    value: 'GumgaURL'
                }
            ]
        }
    ]).then(answers => {
        answers.fieldName = util.lowerFirstLetter(answers.fieldName);
        attributes = attributes.concat(`${answers.fieldName}:${answers.fieldType},`)
        ora('Adicionando campo').start().succeed(`Campo ${answers.fieldName} do tipo ${answers.fieldType} foi criado.`);
        callback(attributes);
    });
}

const createEntity = (args, projectInfo, packageEntity, entityExtends, attributes) => {
    const spinner = ora('Gerando entidade...').start();
    let command = `cd ${projectInfo.artifactId}-domain && mvn io.gumga:gumgag:entidade ${entityExtends} -Dentidade=${packageEntity}`;
    if (attributes) command += ` -Datributos="${attributes}" `;
    exec(command, { maxBuffer: Infinity }, function (error, stdout, stderr) {
        if (error !== null) {
            spinner.fail(`Problemas ao gerar sua entidade. \n ${error}`);
        } else {
            spinner.text = 'Executando: mvn clean install';
            util.build().then(resp => {
                spinner.succeed(`Entidade gerada com sucesso.`);

                let choices = [];

                choices.push({
                    name: 'SERVICE',
                    value: 'SERVICE'
                });

                choices.push({
                    name: 'API',
                    value: 'API'
                });

                if (projectInfo.presentationMode != 'NONE') {
                    choices.push({
                        name: 'FRONT-END',
                        value: 'FRONTEND'
                    });
                }

                inquirer.prompt([
                    {
                        type: 'checkbox',
                        message: 'O que deseja gerar apartir dessa entidade?',
                        name: 'choices',
                        choices: choices
                    }
                ]).then(data => {
                    generateChoicesPending(data.choices, packageEntity, args.entityName);
                })

            }, err => {
                spinner.fail(`Problemas ao gerar sua entidade. \n ${err}`);
            })
        }
    });
}

const generateChoicesPending = (choices, packageEntity, entityName) => {
    let executing = false;
    choices.forEach(choice => {
        if (!executing) {
            executing = true;
            switch (choice) {
                case 'SERVICE':
                    projectService.generateServiceByEntity(packageEntity, entityName, () => {
                        generateChoicesPending(choices.filter(choiceValue => choiceValue != choice), packageEntity, entityName);
                    });
                    break;
                case 'API':
                    projectAPI.generateAPIByEntity(packageEntity, entityName, () => {
                        generateChoicesPending(choices.filter(choiceValue => choiceValue != choice), packageEntity, entityName);
                    });
                    break;
                case 'FRONTEND':
                    projectFRONT.generateFrontByEntity(packageEntity, entityName, () => {
                        generateChoicesPending(choices.filter(choiceValue => choiceValue != choice), packageEntity, entityName);
                    });
                    break;
            }
        }
    })
}