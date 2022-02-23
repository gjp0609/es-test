const { initIndices, saveFilesInfo, query, queryBySQL } = require('./crud');

(async () => {
    let dir = 'R:/';
    let indexName = 'user-177';
    let userPhone = '17777777777';
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
            await saveFilesInfo(dir, indexName, userPhone, 10000);
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
