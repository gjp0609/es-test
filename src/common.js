function formatDate(time) {
    return (
        time.getFullYear() +
        '-' +
        (time.getMonth() + 1 < 10 ? '0' : '') +
        (time.getMonth() + 1) +
        '-' +
        (time.getDate() < 10 ? '0' : '') +
        time.getDate() +
        ' ' +
        (time.getHours() < 10 ? '0' : '') +
        time.getHours() +
        ':' +
        (time.getMinutes() < 10 ? '0' : '') +
        time.getMinutes() +
        ':' +
        (time.getSeconds() < 10 ? '0' : '') +
        time.getSeconds()
    );
}
const TYPES = [
    { name: 'dir', suffix: [] },
    { name: 'image', suffix: ['.png', '.jpg', '.jpeg', '.bmp', '.gif'] },
    { name: 'text', suffix: ['.txt', '.md', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.wps', '.json'] },
    { name: 'video', suffix: ['.mkv', '.mp4'] },
    { name: 'music', suffix: ['.mp3', '.ape', '.flac'] },
    { name: 'zipped', suffix: ['.zip', '.7z', '.rar', '.tar', '.gz', '.gzip'] },
    { name: 'other', suffix: [] }
];

module.exports = {
    TYPES,
    formatDate
};
