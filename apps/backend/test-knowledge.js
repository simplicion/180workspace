const { PrismaClient } = require('@workspace/db');
const prisma = new PrismaClient();

async function runTests() {
    console.log("=== Starting Knowledge Base Tests ===");

    try {
        const user = await prisma.user.findFirst();
        const company = await prisma.company.findFirst();
        
        if (!user || !company) {
            console.log("No user or company found. Ensure DB is seeded.");
            return;
        }

        // 1. Test Creation
        console.log("1. Testing Article Creation...");
        const article = await prisma.knowledgeArticle.create({
            data: {
                title: 'Test SOP for Deployment',
                content: '<p>This is how we deploy</p>',
                category: 'Engineering',
                createdById: user.id,
                updatedById: user.id,
                companyId: company.id
            }
        });
        console.log(`✅ Created article with ID: ${article.id}`);

        // 2. Test Lock Mechanism
        console.log("2. Testing Lock Mechanism...");
        const lockedArticle = await prisma.knowledgeArticle.update({
            where: { id: article.id },
            data: {
                lockedById: user.id,
                lockedAt: new Date()
            }
        });
        if (lockedArticle.lockedById === user.id) {
            console.log("✅ Lock applied successfully");
        }

        // 3. Test Snapshot / Versioning
        console.log("3. Testing Version Snapshots (Max 2)...");
        // Create 3 versions
        for (let i = 1; i <= 3; i++) {
            await prisma.knowledgeArticleVersion.create({
                data: {
                    articleId: article.id,
                    content: `<p>Version ${i}</p>`,
                    createdById: user.id
                }
            });

            // Clean up old versions
            const versions = await prisma.knowledgeArticleVersion.findMany({
                where: { articleId: article.id },
                orderBy: { createdAt: 'desc' }
            });

            if (versions.length > 2) {
                const versionsToDelete = versions.slice(2);
                for (const v of versionsToDelete) {
                    await prisma.knowledgeArticleVersion.delete({ where: { id: v.id } });
                }
            }
        }

        const finalVersions = await prisma.knowledgeArticleVersion.findMany({
            where: { articleId: article.id }
        });
        
        if (finalVersions.length === 2) {
            console.log("✅ Version limit enforced (Max 2 retained)");
        } else {
            console.log("❌ Version limit failed, found " + finalVersions.length);
        }

        // 4. Test Full Text Search
        console.log("4. Testing Full Text Search...");
        const searchResults = await prisma.knowledgeArticle.findMany({
            where: {
                title: {
                    search: 'Deployment'
                }
            }
        });
        
        if (searchResults.length > 0) {
            console.log("✅ Full Text Search working. Found: " + searchResults[0].title);
        } else {
            console.log("❌ Full Text Search failed to find the document.");
        }

        // Cleanup
        await prisma.knowledgeArticleVersion.deleteMany({ where: { articleId: article.id } });
        await prisma.knowledgeArticle.delete({ where: { id: article.id } });
        console.log("✅ Cleanup complete.");

    } catch (e) {
        console.error("❌ Test failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

runTests();
