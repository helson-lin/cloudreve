#!/usr/bin/env node
const request = require('request')
request.debug = false;
const progress = require('request-progress');
const fs = require('fs');
const path = require('path');

const { handlerCookie, getConfig, setConfig } = require('./utils');
const log = require('./log');
const commands = require('./command');

class Cloudreve {
    constructor() {
        this.log = log;
        this.init();
    }
    async init () {
        this.commands = commands;
        const config = getConfig();
        this.config = JSON.parse(config);
        if (this.config.cookies) {
            this.cookies = this.config.cookies;
        } else {
            if(!this.config.baseUrl || !this.config.userName || !this.config.passWord) {
                log.info('请检查配置文件是否完善！！！');
                return;
            };
            const res = await this.cloudreveLogin(this.config.baseUrl, this.config.userName, this.config.passWord);
            if (res.cookies) this.config.cookies = res.cookies; setConfig(this.config); // 保存到config文件
            if (res.body.code === 0) {
                this.saveType = res.body.data.policy.saveType; // 保存类型
                this.upUrl = res.body.data.policy.upUrl; // 上传的url
                this.userId = res.body.data.id; // 用户id
            }
        }
    }
    /**
     * @description: cloudreve登录
     * @param {*} url
     * @param {*} userName
     * @param {*} Password
     * @return {*}
     */
    async cloudreveLogin (url, userName, Password) {
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: `${url}/user/session`,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ userName, Password, captchaCode: '' }),
            }, function (err, httpResponse, body) {
                if (err) {
                    reject(err)
                } else {
                    const response = JSON.parse(body);
                    if (response.code !== 0) {
                        log.error(`登录失败：${response.msg}`);
                    } else {
                        const cookies = httpResponse.headers['set-cookie'];
                        resolve({ body: JSON.parse(body), cookies: handlerCookie(cookies[0]) })
                    }
                }
            })
        })
    }
    /**
     * @description: 获取请求头
     * @param {*}
     * @return {*}
     */
    getHeaders () {
        const headers = {};
        headers['Content-Type'] = 'application/json';
        headers['cookie'] = `path_tmp=; cloudreve-session=${this.config.cookies}`;
        headers['path'] = '/api/v3/user/storage';
        return headers;
    }
    /**
     * @description: 获取上传文件的Session;
     * @param {*} params
     * @return {*}
     */
    getUploadSession (params) {
        const data = { path: this.config.dir || '/', ...params, type: this.saveType };
        return new Promise((resolve, reject) => {
            request.get(`${this.config.baseUrl}/file/upload/credential`, {
                headers: {
                    ...this.getHeaders()
                },
                qs: data,
            }, function (err, httpResponse, body) {
                if (err) {
                    if (String(err).indexOf('Invalid URI') !== -1) {
                        log.error('文件名称不合法！！');
                    } else {
                        log.error(err);
                    }
                    reject(err)
                } else {
                    resolve(JSON.parse(body))
                }
            })
        })
    }
    /**
     * @description: 上传文件到服务器
     * @param {string} url 上传路径
     * @param {string} contentRanges conten-ranges
     * @param {string} path 文件路径
     * @return {*}
     */
    uploadFile (url, contentRanges, path) {
        const Headers = {
            ...this.getHeaders()
        }
        Headers['content-type'] = 'application/octet-stream';
        Headers['content-range'] = contentRanges;
        return new Promise((resolve, reject) => {
            let bytes = 0;
            const uploaded = request({
                url,
                method: 'PUT',
                body: fs.readFileSync(path),
                headers: Headers,
            }, function (err, httpResponse, body) {
                if (err) {
                    if (String(err).indexOf('Invalid URI') !== -1) {
                        log.error('文件名称不合法！！');
                    }
                    reject(err)
                } else {
                    resolve(JSON.parse(body))
                }
            })
        });
    }
    /**
     * @description: 小文件上传
     * @param {string} name 文件名
     * @param {string} path 文件路径
     * @return {*}
     */
    miniSizeUploadFile (name, path) {
        const Headers = {
            ...this.getHeaders()
        }
        Headers['content-type'] = 'application/octet-stream';
        Headers['x-path'] = encodeURI(`${this.config.dir || '/'}`);
        Headers['x-filename'] = encodeURI(name);
        return new Promise((resolve, reject) => {
            const uploaded = request({
                url: `${this.config.baseUrl}/file/upload?chunk=0&chunks=1`,
                method: 'POST',
                body: fs.readFileSync(path),
                headers: Headers,
            }, function (err, httpResponse, body) {
                if (err) {
                    if (err.indexOf('Invalid URI') !== -1) {
                        log.error('文件名称不合法！！');
                    }
                    reject(err)
                } else {
                    resolve(JSON.parse(body))
                }
            })
        });
    }
    /**
     * @description: 触发cloudreve文件保存
     * @param {string} url token地址
     * @param {object} data uploadFile 回传参数
     * @return {*}
     */
    saveFile (url, data) {
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                url: url,
                json: false,
                headers: {
                    "content-type": "text/plain",
                },
                body: JSON.stringify(data),
            }, function (err, httpResponse, body) {
                if (err) {
                    reject(err)
                }
                if (httpResponse.statusCode == 200) {
                    resolve(body);
                }
            })
        })
    }
}

const cloudreve = new Cloudreve();

const argv = process.argv.slice(2);
if (argv.length === 0) {
    const keys = Object.keys(cloudreve.commands).join(',');
    log.info(`请输入以下命令: ${keys}`);
    return;
};
const command = argv[0];
const options = argv.slice(1);
if (!cloudreve.commands[command]) {
    log.info('不支持该命令！！！');
    return;
}
cloudreve.commands[command].call(cloudreve, ...options);