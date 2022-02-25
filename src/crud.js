const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');
const { TYPES, formatDate } = require('./common');
require('dotenv').config();

// 创建 ES 客户端
const client = new Client({
    node: process.env.ES_URL,
    auth: {
        username: process.env.ES_USER_NAME,
        password: process.env.ES_USER_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * 创建索引
 *
 * @param indices 索引
 * @returns {Promise<void>}
 */
async function initIndices(indices) {
    let result;
    for (let index of indices) {
        try {
            try {
                await client.indices.delete({ index: index });
            } catch (e) {}
            result = await client.indices.create({
                index,
                settings: {
                    analysis: {
                        analyzer: {
                            ngram_analyzer: {
                                tokenizer: 'ngram_tokenizer'
                            },
                            path_analyzer: {
                                tokenizer: 'path_tokenizer'
                            }
                        },
                        tokenizer: {
                            ngram_tokenizer: {
                                type: 'ngram',
                                min_gram: 1,
                                max_gram: 1,
                                token_chars: []
                            },
                            path_tokenizer: {
                                type: 'path_hierarchy',
                                delimiter: '/'
                            }
                        }
                    }
                },
                mappings: {
                    date_detection: false,
                    properties: {
                        name: { type: 'text', analyzer: 'ngram_analyzer' },
                        path: {
                            type: 'text',
                            analyzer: 'path_analyzer',
                            fields: {
                                keyword: {
                                    type: 'keyword'
                                }
                            }
                        },
                        type: { type: 'keyword' },
                        size: { type: 'unsigned_long' },
                        date: { type: 'date', format: 'epoch_millis', locale: 'zh' },
                        phone: { type: 'keyword' }
                    }
                }
            });
            console.log(result);
        } catch (e) {
            console.info('error', e.message);
        }
    }
}

let fileCount = 0;

/**
 * 读取本地目录文件数据，插入 ES
 *
 * @param dir 文件夹
 * @param indexName 索引
 * @param user 用户
 * @param batchNum 批量数量，默认 10000
 * @returns {Promise<void>}
 */
async function saveFilesInfo(dir, indexName, user, batchNum) {
    await listFiles(dir, indexName, user, batchNum);
    // 插入剩余数据
    await insertDoc(indexName, undefined, false, batchNum);
}

async function listFiles(dir, indexName, user, batchNum) {
    let files;
    try {
        files = fs.readdirSync(path.resolve(dir));
    } catch (e) {
        return;
    }
    for (let filename of files) {
        let filePath = path.join(dir, filename);
        let stats;
        try {
            stats = fs.statSync(path.resolve(filePath));
        } catch (e) {}
        if (!stats) {
            continue;
        }
        let size = stats.size;
        let date = stats.birthtime;
        let type = TYPES.length - 1;
        if (stats.isDirectory()) {
            type = 0;
            await listFiles(filePath, indexName, user);
        } else {
            fileCount++;
            if (fileCount % 10000 === 0) {
                console.log(`${formatDate(new Date())} progress: ${fileCount / 10000}w`);
            }
            for (let i = 0; i < TYPES.length; i++) {
                if (TYPES[i].suffix.indexOf(filename.substring(filename.lastIndexOf('.')).toLowerCase()) > 0) {
                    type = i;
                    break;
                }
            }
        }
        try {
            await insertDoc(
                indexName,
                {
                    name: filename,
                    path: dir.replaceAll(/\\/g, '/'),
                    type,
                    size,
                    date: date.getTime(),
                    phone: user
                },
                true,
                batchNum
            );
        } catch (e) {
            console.log(e);
        }
    }
}

const tempCount = 10000;
let tempDatas = [];

/**
 * 插入文档
 *
 * @param indexName 索引名称
 * @param data 数据对象
 * @param batch 是否批量插入，true 则到足够数量才插入，false 则立即插入当前和之前的数据；默认 false
 * @param batchNum 批量数量，默认 10000
 * @returns {Promise<void>}
 */
async function insertDoc(indexName, data, batch, batchNum) {
    if (data) {
        tempDatas.push(data);
    }
    if (!(batch ?? false) || tempDatas.length >= (batchNum ?? tempCount)) {
        await insertDocs(indexName, tempDatas);
        tempDatas = [];
    }
}

/**
 * 批量插入文档
 *
 * @param indexName 索引名称
 * @param datas 数据对象列表
 * @returns {Promise<void>}
 */
async function insertDocs(indexName, datas) {
    let operations = [];
    for (let data of datas) {
        operations.push({ index: { _index: indexName } });
        operations.push(data);
    }
    let result = await client.bulk({
        refresh: true,
        operations
    });
    if (result.errors) {
        console.log('error:', result.items[0]);
    }
    console.log(`insert ${operations.length / 2} document`);
}

/**
 * 查询数据
 *
 * @param indexName 索引名称
 * @returns {Promise<void>}
 */
async function query(indexName) {
    let result;
    result = await client.search({
        index: indexName,
        query: {
            bool: {
                must: [
                    {
                        term: { phone: '18888888888' }
                    },
                    {
                        match_phrase: { name: 'test' }
                    },
                    {
                        match_phrase: { name: '.js' }
                    }
                ]
                /*filter: [
                    {
                        range: { size: { gt: 100000 } }
                    }
                ]*/
            }
        }
    });
    console.log('total:', result.hits.total);
    console.log('result:', result.hits.hits);
}

/**
 * 查询数据
 *
 * @param indexName 索引名称
 * @returns {Promise<void>}
 */
async function queryBySQL(indexName) {
    let result = await client.sql.query({
        query: `SELECT * FROM "${indexName}" WHERE phone = '18888888888' and match(name, 'test', 'auto_generate_synonyms_phrase_query=true') limit 10`
    });
    console.log(result);
}

module.exports = {
    initIndices,
    insertDoc,
    insertDocs,
    listFiles,
    saveFilesInfo,
    query,
    queryBySQL
};
