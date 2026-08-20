const { CompanyProfileService } = require('@workspace/company');
const { getCompanyPrisma } = require('../../../../config/db');

exports.getPrivateProfile = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const data = await CompanyProfileService.getPrivateProfile(companyId);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get private profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error retrieving profile.' });
    }
};

exports.updatePrivateProfile = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const updatedCompany = await CompanyProfileService.updatePrivateProfile(companyId, req.body);
        res.json({ success: true, data: updatedCompany, message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error updating profile.' });
    }
};

exports.getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const includeJobs = req.query.includeJobs === 'true';

        const data = await CompanyProfileService.getPublicProfile(id, includeJobs, getCompanyPrisma);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get public profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error retrieving profile.' });
    }
};

exports.incrementProfileViews = async (req, res) => {
    try {
        await CompanyProfileService.incrementProfileViews(req.params.id);
        res.json({ success: true, message: 'Profile views incremented' });
    } catch (error) {
        console.error('Increment views error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error incrementing views.' });
    }
};

exports.incrementFollowers = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const result = await CompanyProfileService.followCompany(userId, req.params.id);
        
        if (result.alreadyFollowing) {
            return res.json({ success: true, message: 'Already following' });
        }
        res.json({ success: true, message: 'Successfully followed company' });
    } catch (error) {
        console.error('Follow company error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error following company.' });
    }
};

exports.unfollowCompany = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const result = await CompanyProfileService.unfollowCompany(userId, req.params.id);
        
        if (result.notFollowing) {
            return res.json({ success: true, message: 'Not following' });
        }
        res.json({ success: true, message: 'Successfully unfollowed company' });
    } catch (error) {
        console.error('Unfollow company error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error unfollowing company.' });
    }
};

exports.getFollowStatus = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const isFollowing = await CompanyProfileService.getFollowStatus(userId, req.params.id);
        res.json({ success: true, isFollowing });
    } catch (error) {
        console.error('Get follow status error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error checking follow status.' });
    }
};

exports.updateFinanceTab = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }

        const { companyHighlights, pitchDeckUrl } = req.body;
        const updatedCompany = await CompanyProfileService.updateFinanceTab(companyId, companyHighlights, pitchDeckUrl);
        res.json({ success: true, data: updatedCompany, message: 'Finance tab updated successfully.' });
    } catch (error) {
        console.error('Update finance tab error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error updating finance tab.' });
    }
};

exports.getReviews = async (req, res) => {
    try {
        const data = await CompanyProfileService.getReviews(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error retrieving reviews.' });
    }
};

exports.addReview = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { rating, title, description } = req.body;
        const data = await CompanyProfileService.addReview(req.params.id, userId, rating, title, description);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error adding review.' });
    }
};

exports.getCompanyMilestones = async (req, res) => {
    try {
        const companyId = req.user.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company.' });
        }
        
        // Placeholder for milestones logic (from existing controller)
        res.json({ success: true, data: [] });
    } catch (error) {
        console.error('Get company milestones error:', error);
        res.status(500).json({ success: false, message: 'Server error retrieving milestones.' });
    }
};

exports.verifyDomain = async (req, res) => {
    try {
        const { domain } = req.body;
        const prismaClient = globalPrisma;
        const companyId = req.user.companyId;

        if (!domain) {
            return res.status(400).json({ success: false, message: 'Domain is required' });
        }

        const dns = require('dns').promises;
        try {
            const records = await dns.resolveCname(domain);
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || '';
            const isVerified = records.some(r => r.includes(`cname.${rootDomain}`) || r.includes(rootDomain));
            
            if (!isVerified) {
                return res.status(400).json({ 
                    error: 'DNS Verification Failed',
                    message: `Domain is not pointing to cname.${rootDomain}. Please check your DNS settings.` 
                });
            }
        } catch (error) {
            console.error('DNS Lookup Error:', error);
            return res.status(400).json({ 
                success: false, 
                message: 'Could not verify DNS records. Ensure you added the CNAME record and try again.' 
            });
        }

        await prismaClient.company.update({
            where: { id: companyId },
            data: { customDomain: domain }
        });

        res.status(200).json({ success: true, message: 'Domain successfully verified and linked' });
    } catch (error) {
        console.error('Error in verifyDomain:', error);
        res.status(500).json({ success: false, message: error.message || 'Server error verifying domain' });
    }
};
