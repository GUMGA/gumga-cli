const ora = require('ora');
const exec = require('child_process').exec;
const util = require('./command/common/util');
const { getInstalledPath } = require('get-installed-path');
const inquirer = require('inquirer');
const opener = require("opener");

module.exports = {
    run: (prog) => {
        getInstalledPath('@angular/cli').then(function(pt){
            util.testApplicationInstalled('java', /(java version|openjdk version)/g, function(javaInstalled){
              if(javaInstalled){
                util.testApplicationInstalled('mvn', 'Apache Maven', function(mavenInstalled){
                  if(mavenInstalled){
                    prog.parse(process.argv);
                  }else{
                    inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'openMaven',
                            message: `Não encontramos o MAVEN na sua máquina, deseja saber informações de como instala-lo?`
                        }
                    ]).then(answersMaven => {
                      if(answersMaven.openMaven){
                        opener('https://maven.apache.org/download.cgi');
                      }else{
                        console.log('Finalize a instalação das dependências e tente novamente.');
                      }
                    })
                  }
                });
              }else{
                inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'openJava',
                        message: `Não encontramos o JAVA na sua máquina, deseja saber informações de como instala-lo?`
                    }
                ]).then(answersJava => {
                  if(answersJava.openJava){
                    opener('http://www.oracle.com/technetwork/pt/java/javase/downloads/jdk8-downloads-2133151.html');
                  }else{
                    console.log('Finalize a instalação das dependências e tente novamente.');
                  }
                })
              }
            });
          }, () => {
            const spinner = ora('Aguarde...').start();
            spinner.fail(`Não encontramos algumas dependências, execute: npm install -g @angular/cli`);
          });
    }
}
