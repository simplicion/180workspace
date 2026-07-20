const { getTenantPrisma } = require('@workspace/db');

async function test() {
    try {
        const companyId = 'test-company-id'; // We can use an existing company ID or just get any employee
        
        // Let's first get a user who is an employee
        const db = require('@workspace/db').prisma;
        
        const user = await db.user.findFirst({
            where: { role: 'employee' }
        });
        
        if (!user) {
            console.log('No employee found');
            return;
        }
        
        const tenantDb = await getTenantPrisma(user.companyId);
        
        console.log('Employee:', user.id, user.name, user.role);
        
        const Task = tenantDb.task;
        const Project = tenantDb.project;
        const Leave = tenantDb.leave;
        const Attendance = tenantDb.attendance;
        
        const todayStr = new Date().toISOString().slice(0, 10);
        
        console.log('Running queries...');
        const [
            myTasks, myProjects, myLeaves, myAttendance,
            recentTasks, recentProjects
        ] = await Promise.all([
            Task ? Task.count({ where: {assigneeId: user.id, status: { not: 'done' }} }) : 0,
            Project ? Project.count({ where: {memberIds: { has: user.id }, status: { not: 'completed' }} }) : 0,
            Leave ? Leave.count({ where: {employeeId: user.id, status: 'pending'} }) : 0,
            Attendance ? Attendance.findFirst({ where: { employeeId: user.id, date: todayStr } }) : null,
            Task ? Task.findMany({ where: {assigneeId: user.id, status: { not: 'done' }}, take: 10, select: { title: true, status: true } }) : [],
            Project ? Project.findMany({ where: {memberIds: { has: user.id }, status: { not: 'completed' }}, take: 10, select: { name: true, status: true } }) : []
        ]);
        
        console.log('Success:', { myTasks, myProjects, myLeaves });
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
