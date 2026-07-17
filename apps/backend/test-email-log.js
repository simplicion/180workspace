const db = require('@workspace/db');
console.log(Object.keys(db));
if (db.prisma) {
    db.prisma.emailLog.groupBy({
        by: ['status'],
        _count: { _all: true }
    }).then(console.log).catch(console.error).finally(() => db.prisma.$disconnect());
}
