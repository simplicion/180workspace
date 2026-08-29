const { PrismaClient } = require('@workspace/db');
const prisma = new PrismaClient();
async function main() {
    try {
        const docs = await prisma.knowledgeArticle.findMany({ take: 5 });
        console.log('Docs found:', docs.length);
        if (docs.length > 0) console.log(docs[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
