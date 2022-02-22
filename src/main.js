const { query, queryBySQL, initIndices, listFiles, insertDoc } = require('./crud');

(async () => {
    let operation = process.argv[2] ?? 'none';
    console.log('start:', operation);
    switch (operation) {
        case 'indexes': {
            // 删除数据，创建索引
            await initIndices(['user-188']);
            break;
        }
        case 'initData': {
            // 插入数据
            await listFiles('C:/Files/Temp', 'user-188', '18888888888');
            await insertDoc('user-188', undefined, true);
            break;
        }
        case 'query': {
            await query();
            break;
        }
        case 'queryBySQL': {
            await queryBySQL();
            break;
        }
        default: {
            console.log('do nothing');
        }
    }
})();
