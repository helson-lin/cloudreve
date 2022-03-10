const path = require('path');
const fs = require('fs');
const { toAsyncAwait } = require('../utils');
let spinner;
let p = 0;
module.exports = {
    func: upload,
    alias: 'up,--upload,upload,--up',
};
/**
 * @description: 读取文件夹下文件
 * @param {string} path  文件夹路径
 * @return {*}
 */
function readDir (path) {
    return new Promise((resolve, reject) => {
        fs.readdir(path, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    })
}
function fileUpload (path) {

}
/**
 * @description: 处理文件上传
 * @param {string} dir 文件路径
 * @param {reg} pattern 文件名称正则
 * @return {*}
 */
function handlerUploadFile (dir, pattern) {
    return new Promise((resolve, reject) => {
        fs.stat(dir, async (err, data) => {
            if (err) {
                this.log.error(`文件不存在，请检查目录: \n ${err}`);
                reject(err);
            }
            if (data) {
                const uploadInfo = { name: dir.match(pattern)[0], size: data.size };
                this.log.info(`开始上传:${uploadInfo.name}`);
                const contentRanges = `bytes 0-${data.size - 1}/${data.size}`;
                if (data.size < 1500000) {
                    // 小文件上传
                    const { error, result } = await toAsyncAwait(this.miniSizeUploadFile(uploadInfo.name, dir));
                    if (error || result.code !== 0) {
                        this.log.warn(`${uploadInfo.name}:${error || result.msg}!!!`);
                        reject(error);
                    } else {
                        this.log.success(`上传完毕:${uploadInfo.name}`);
                        resolve(result);
                    }
                } else {
                    // 大文件上传
                    const { error, result: res } = await toAsyncAwait(this.getUploadSession(uploadInfo));
                    if (error || res.code !== 0) {
                        this.log.warn(`${uploadInfo.name}:${error || res.msg}!!!`);
                        reject(error);
                    } else {
                        const { token, policy } = res.data;
                        const { error, result: uploadRes } = await toAsyncAwait(this.uploadFile(`${policy}&name=${uploadInfo.name}&chunk=0&chunks=1`, contentRanges, dir, data.size));
                        if (!error) {
                            let result = await this.saveFile(token, uploadRes);
                            result = result && JSON.parse(result);
                            if (result.code !== 0) {
                                this.log.warn(`${uploadInfo.name}:${result.msg}!!!`);
                            } else {
                                this.log.success(`上传完毕:${uploadInfo.name}`);
                            }
                            resolve(result);
                        } else {
                            this.log.warn(`${uploadInfo.name}:${error || result.msg}!!!`);
                            reject(error);
                        }
                    }
                }
            }
        })
    })
}
/**
 * @description: 上传文件
 * @param {array} options 上传文件路径
 * @return {*}
 */
function upload (...options) {
    const _this = this;
    if (!spinner) {
        spinner = 1;
        this.log.info(`------------开始上传任务------------`);
    }
    if (options.length === 0) {
        this.log.info('upload 需要指定上传文件或者目录！！！');
        return;
    }
    // 获取当前文件目录
    options.forEach(pathDir => {
        const pattern = /([^<>/\\\|:""\*\?]+)\.\w+$/;
        const dir = path.join(process.cwd(), pathDir);
        if (pathDir.match(/\/\.([^<>/\\\|:""\*\?]+)\w+$/)) return;
        if (!pathDir.match(pattern)) {
            // 目录读取上传;
            readDir(dir).then(files => {
                const paths = files.map(item => `${pathDir}/${item}`);
                upload.call(this, ...paths);
            });
            return;
        }
        p += 1;
        handlerUploadFile.apply(this, [dir, pattern]).then(() => {
            p -= 1;
            if (p === 0) {
                this.log.success('------------上传任务全部完成！------------');
            }
        }).catch(err => {
            p -= 1;
            if (p === 0) {
                this.log.success('------------上传任务全部完成！------------');
            }
        })
    });
}