const path = require('path');
const fs = require('fs');
const userHome = require('user-home');
const log = require('./log');
const dirPath = path.join(userHome, '/cloudreve'); // 文件目录
const configTemplate = {
    userName: '',
    passWord: '',
    baseUrl: '',
    cookies: '', // cookies
    dir: '/', // 上传目录
}
/**
 * @description: 处理Cookie
 * @param {string} cookie
 * @return {*}
 */
const handlerCookie = (cookie) => {
    const val = cookie.split(';')[0].split('=')[1];
    return val;
}
/**
 * @description: 获取Config
 * @param {*}
 * @return {*}
 */
const getConfig = () => {
    if (fs.existsSync(dirPath) === false) {
        fs.mkdirSync(dirPath);
        // 创建文件 =>
        log.success(`请前往文件夹:${dirPath},配置config.json`);
        fs.writeFileSync(path.join(dirPath, '/config.json'), JSON.stringify(configTemplate), 'utf8');
    }
    return fs.readFileSync(path.join(dirPath, '/config.json'), 'utf-8');
}
/**
 * @description: 保存config到本地
 * @param {object} config 配置文件
 * @return {*} null
 */
const setConfig = (config) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(dirPath, '/config.json'), JSON.stringify(config, null, ' '), 'utf8', (err, data) => {
            if (err) {
                reject(err);
                log.error(err);
            }
            resolve(config);
        });
    })
}

/**
 * @param {*} promise 异步方法主体
 * @param {*} fromatResult 是否处理成统一格式，不处理则直接返回第一个参数。 true处理，false不处理，默认为true :::
 * @return {error,resutl}  有错误 resutl为null,error为错误体。没错误 error为null result为结果
 */
const toAsyncAwait = (promise, fromatResult = true) => {
    if (!fromatResult) {
        return promise;
    } else {
        return promise.then((res) => ({ error: null, result: res })).catch((err) => ({ error: err, result: null }));
    }
}
module.exports = {
    handlerCookie,
    getConfig,
    setConfig,
    toAsyncAwait,
}