const fs = require('fs');
const p = 'C:/Users/saavi/OneDrive/Desktop/180workspace/packages/domains/identity/src/auth/auth.service.ts';
let code = fs.readFileSync(p, 'utf8');

const original = `        let user = currentUser;
        let companyId = reqCompany?.id;
        const companyPrisma = getCompanyPrisma(companyId);

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || (reqCompany.metadata as any)?.onboardingToken !== onboardingTokenHeader) {
                throw AppError.forbidden('Invalid or expired onboarding token');
            }
            user = await companyPrisma.user.findFirst({ where: { role: 'admin' } });
            companyId = reqCompany.id;
        }

        if (!user) {
            throw AppError.unauthorized('Authentication required to complete setup');
        }`;

const replacement = `        let user = currentUser;
        let companyId = reqCompany?.id;

        if (!user && onboardingTokenHeader) {
            if (!reqCompany || (reqCompany.metadata as any)?.onboardingToken !== onboardingTokenHeader) {
                throw AppError.forbidden('Invalid or expired onboarding token');
            }
            companyId = reqCompany.id;
        }

        if (!companyId) {
            throw AppError.badRequest('Company context is missing');
        }

        return requestContext.run({ companyId }, async () => {
            const companyPrisma = globalPrisma;

            if (!user && onboardingTokenHeader) {
                user = await companyPrisma.user.findFirst({ where: { role: 'admin' } });
            }

            if (!user) {
                throw AppError.unauthorized('Authentication required to complete setup');
            }`;

code = code.replace(original, replacement);

const originalEnd = `        } catch (emailErr) { /* Email failure should not block setup completion */ }

        return { token: accessToken, refreshToken, user: updatedUser, config, companyId, companyType: resolvedCompanyType, teamSize, enabledApps };
    }`;

const replacementEnd = `        } catch (emailErr) { /* Email failure should not block setup completion */ }

        return { token: accessToken, refreshToken, user: updatedUser, config, companyId, companyType: resolvedCompanyType, teamSize, enabledApps };
        });
    }`;

code = code.replace(originalEnd, replacementEnd);

fs.writeFileSync(p, code);
console.log('Fixed completeWorkspaceSetup');
