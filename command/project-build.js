const util = require('./common/util');
const ora = require('ora');
const exec = require('child_process').exec;

module.exports = {
    run: function(args, options, logger){
        if(!util.directoryIsProjectGG()){
            logger.error('Não identificamos o diretório atual como um projeto GUMGA, certifique-se de estar na pasta raiz do projeto.');
            return;
        }
        const spinner = ora('Compilando projeto...').start();
        let firstMessage = setTimeout(() => {
            spinner.color = 'yellow';
            spinner.text = 'Aguarde, isso pode levar alguns minutos...';
        }, 7000);
        let secondaryMessage = setTimeout(() => {
            spinner.color = 'green';
            spinner.text = 'Que tal tomar um café enquanto isso...';
        }, 20000);
        exec(`mvn clean install`, {maxBuffer: Infinity}, function (error, stdout, stderr) {     
            if (error !== null) {
                spinner.fail(`Problemas ao compilar seu projeto. \n ${error}`);            
            } else {
                clearTimeout(firstMessage);
                clearTimeout(secondaryMessage);
                spinner.succeed(`Compilado com sucesso.`);
            }                    
        });
    }
}