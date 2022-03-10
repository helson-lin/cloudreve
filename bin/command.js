'use strict';
const requireContext = require('node-require-context')
const path = require('path');
class Command {
    constructor() {
        this.init();
    }
    init () {
        const commands = requireContext('./command', false, /\.js$/);
        commands.keys().forEach(moduleId => {
            const moduleName = moduleId.replace(/(\.\/|\.js)/g, '').split('command')[1].slice(1);
            const module = require(`./command/${moduleName}`);
            const alias = module.alias.split(',');
            const mainName = module.func.toString().substr('function '.length).split('(')[0].trim();
            this[mainName] = module.func;
        })
    }
}

const command = new Command();

module.exports = command;