const { prisma } = require('@workspace/db');
'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const signToken = (admin) => jwt.sign(
    { id: admin.id, role: 'superadmin', email: admin.email },
    process.env.SUPER_ADMIN_JWT_SECRET,
    { expiresIn: process.env.SUPER_ADMIN_JWT_EXPIRES_IN || '8h' }
);

const toSafeObject = (admin) => {
    const { passwordHash, ...safeAdmin } = admin;
    return safeAdmin;
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
        
        const admin = await prisma.superAdmin.findUnique({ 
            where: { email: email.toLowerCase() } 
        });
        
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
        
        const valid = await bcrypt.compare(password, admin.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = signToken(admin);
        res.json({ token, superAdmin: toSafeObject(admin) });
    } catch (err) {
        console.error('SA login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
};

exports.getMe = async (req, res) => {
    res.json({ superAdmin: toSafeObject(req.superAdmin) });
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const existingEmail = await prisma.superAdmin.findFirst({ 
            where: { 
                email: email.toLowerCase(), 
                id: { not: req.superAdmin.id } 
            } 
        });
        if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

        const updateData = { email: email.toLowerCase() };
        if (name) updateData.name = name;

        const updatedAdmin = await prisma.superAdmin.update({
            where: { id: req.superAdmin.id },
            data: updateData
        });

        res.json({ message: 'Profile updated successfully', superAdmin: toSafeObject(updatedAdmin) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
        
        const admin = await prisma.superAdmin.findUnique({ where: { id: req.superAdmin.id } });
        
        const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const hashedNewPassword = await bcrypt.hash(newPassword, 12);
        
        await prisma.superAdmin.update({
            where: { id: admin.id },
            data: { passwordHash: hashedNewPassword }
        });
        
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change password' });
    }
};

exports.logout = (req, res) => {
    res.json({ message: 'Logged out successfully' });
};
