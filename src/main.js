const { query, queryBySQL, initIndices, listFiles, insertDoc } = require('./crud');

(async () => {
    let indexName = 'user-188';
    let operation = process.argv[2] ?? 'none';
    console.log('start:', operation);
    switch (operation) {
        case 'indexes': {
            // 删除数据，创建索引
            await initIndices([indexName]);
            break;
        }
        case 'initData': {
            // 插入数据
            await listFiles('C:/Files/Temp', indexName, '18888888888');
            await insertDoc(indexName, undefined, true);
            break;
        }
        case 'query': {
            await query(indexName);
            break;
        }
        case 'queryBySQL': {
            await queryBySQL(indexName);
            break;
        }
        default: {
            console.log('do nothing');
        }
    }
})();
