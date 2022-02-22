const { Client } = require('@elastic/elasticsearch');
const fs = require('fs');
const path = require('path');
const { TYPES, formatDate } = require('./common');
require('dotenv').config();

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
                                tree: {
                                    type: 'text',
                                    analyzer: 'path_analyzer'
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

async function listFiles(dir, indexName, user) {
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
        if (stats.isDirectory()) {
            await listFiles(filePath, indexName, user);
        } else {
            fileCount++;
            if (fileCount % 10000 === 0) {
                console.log(`${formatDate(new Date())} progress: ${fileCount / 10000}w`);
            }
            let size = stats.size;
            let date = stats.birthtime;
            let type = TYPES.length - 1;
            for (let i = 0; i < TYPES.length; i++) {
                if (TYPES[i].suffix.indexOf(filename.substring(filename.lastIndexOf('.')).toLowerCase()) > 0) {
                    type = i;
                    break;
                }
            }
            try {
                await insertDoc(indexName, {
                    name: filename,
                    path: filePath.replaceAll(/\\/g, '/'),
                    type: type,
                    size,
                    date: date.getTime(),
                    phone: user
                });
            } catch (e) {
                console.log(e);
            }
        }
    }
}

let operations = [];
const tempCount = 10000;

async function insertDoc(indexName, data, end) {
    if (data) {
        operations.push({ index: { _index: indexName } });
        operations.push(data);
    }
    if (end || operations.length >= tempCount) {
        let result = await client.bulk({
            refresh: true,
            operations
        });
        console.log(`${new Date()} insert ${operations.length / 2} document`);
        if (result.errors) {
            console.log(result.items[0]);
        }
        operations = [];
    }
}

async function query() {
    let result;
    result = await client.search({
        index: 'text',
        query: {
            bool: {
                must: [
                    {
                        term: { phone: '18888888888' }
                    },
                    {
                        match_phrase: { name: '人口统' }
                    },
                    {
                        match_phrase: { name: '.docx' }
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

async function queryBySQL() {
    return await client.sql.query({
        query: `SELECT *
                FROM "other"
                WHERE phone = '18888888888'
                  and match(name, '人口统', 'auto_generate_synonyms_phrase_query=true')`
    });
}

module.exports = {
    initIndices,
    insertDoc,
    listFiles,
    query,
    queryBySQL
};
