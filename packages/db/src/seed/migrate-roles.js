const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateRoles() {
    console.log('Starting role migration...');

    try {
        const users = await prisma.user.findMany();
        console.log(`Found ${users.length} users to migrate.`);

        // Pre-seed some default designations
        const defaultDesignations = [
            { name: 'Manager', category: 'management' },
            { name: 'HR Manager', category: 'human-resources' },
            { name: 'Finance Executive', category: 'finance' },
            { name: 'Sales Representative', category: 'sales' },
            { name: 'Employee', category: 'general' }
        ];

        let createdCount = 0;
        let updatedUsers = 0;

        for (const user of users) {
            let newRole = 'employee';
            let permissions = [];
            let designationName = 'Employee';
            
            // Map old roles
            const oldRole = user.role?.toLowerCase() || 'employee';

            if (oldRole === 'admin' || oldRole === 'bmsp_super_admin' || oldRole === 'superadmin') {
                newRole = 'admin';
                if (oldRole === 'bmsp_super_admin') newRole = 'BMSP_SUPER_ADMIN'; // preserve platform admin
            } else if (oldRole === 'manager') {
                permissions.push('can_manage_team');
                designationName = 'Manager';
            } else if (oldRole === 'hr') {
                permissions.push('can_manage_hr', 'can_manage_team');
                designationName = 'HR Manager';
            } else if (oldRole === 'finance') {
                permissions.push('can_manage_finance');
                designationName = 'Finance Executive';
            } else if (oldRole === 'sales') {
                permissions.push('can_manage_sales');
                designationName = 'Sales Representative';
            }

            // Create designation if it doesn't exist for this company
            let designation = null;
            if (user.companyId) {
                designation = await prisma.designation.findUnique({
                    where: {
                        companyId_name: {
                            companyId: user.companyId,
                            name: designationName
                        }
                    }
                });

                if (!designation) {
                    const category = defaultDesignations.find(d => d.name === designationName)?.category || 'general';
                    designation = await prisma.designation.create({
                        data: {
                            name: designationName,
                            category,
                            companyId: user.companyId
                        }
                    });
                    createdCount++;
                }
            }

            // Update user
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    role: newRole,
                    permissions: permissions,
                    designationId: designation ? designation.id : null
                }
            });

            updatedUsers++;
        }

        console.log(`Migration complete! Updated ${updatedUsers} users and created ${createdCount} designations.`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrateRoles();
