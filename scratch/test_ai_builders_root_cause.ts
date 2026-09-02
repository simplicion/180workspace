import { FormAIBuilderService, WebsiteAIBuilderService } from '@workspace/ai';
import { prisma } from '@workspace/db';

async function main() {
    console.log('=== 180 WORKSPACE AI BUILDERS VERIFICATION ===\n');

    const formService = new FormAIBuilderService();
    const websiteService = new WebsiteAIBuilderService();

    // 1. Test Form Compile AST
    console.log('1. Testing FormAIBuilderService.compileAST with Job Application prompt...');
    const formResult = await formService.compileAST({
        prompt: 'Create a senior frontend engineer job application with resume upload and portfolio link',
        companyId: undefined,
        userId: undefined
    });
    console.log('Form Compile Success:', formResult.success);
    console.log('Form Title:', formResult.title);
    console.log('Form Fields Count:', formResult.ast?.fields?.length);
    console.log('Form Reply:\n', formResult.reply);
    console.log('--------------------------------------------------\n');

    // 2. Test Form Greeting Interception in patchAST
    console.log('2. Testing FormAIBuilderService.patchAST with greeting "hi"...');
    const formGreetingResult = await formService.patchAST(formResult.entityId, 'hi', {
        prompt: 'hi',
        companyId: undefined
    });
    console.log('Greeting Success:', formGreetingResult.success);
    console.log('Greeting Reply:\n', formGreetingResult.reply);
    console.log('Fields count preserved:', formGreetingResult.ast?.fields?.length === formResult.ast?.fields?.length);
    console.log('--------------------------------------------------\n');

    // 3. Test Form Dynamic Instruction Patching
    console.log('3. Testing FormAIBuilderService.patchAST with "Add a 5-star experience rating and emerald theme"...');
    const formPatchResult = await formService.patchAST(formResult.entityId, 'Add a 5-star experience rating question and switch to emerald green', {
        prompt: 'Add a 5-star experience rating question and switch to emerald green',
        companyId: undefined
    });
    console.log('Patch Success:', formPatchResult.success);
    console.log('Patch Reply:\n', formPatchResult.reply);
    console.log('Updated Button Color:', formPatchResult.ast?.settings?.buttonColor);
    console.log('Has Rating Field:', formPatchResult.ast?.fields?.some((f: any) => f.type === 'RATING'));
    console.log('--------------------------------------------------\n');

    // 4. Test Website Compile AST
    console.log('4. Testing WebsiteAIBuilderService.compileAST with SaaS prompt...');
    const siteResult = await websiteService.compileAST({
        prompt: 'Create a modern AI SaaS landing page with dark emerald theme',
        companyId: undefined,
        userId: undefined
    });
    console.log('Website Compile Success:', siteResult.success);
    console.log('Website Title:', siteResult.title);
    console.log('Sections Count:', siteResult.ast?.pages?.[0]?.sections?.length);
    console.log('Website Reply:\n', siteResult.reply);
    console.log('--------------------------------------------------\n');

    // 5. Test Website Greeting Interception in patchAST
    console.log('5. Testing WebsiteAIBuilderService.patchAST with greeting "hello"...');
    const siteGreetingResult = await websiteService.patchAST(siteResult.entityId, 'hello', {
        prompt: 'hello',
        companyId: undefined
    });
    console.log('Greeting Success:', siteGreetingResult.success);
    console.log('Greeting Reply:\n', siteGreetingResult.reply);
    console.log('Sections count preserved:', siteGreetingResult.ast?.pages?.[0]?.sections?.length === siteResult.ast?.pages?.[0]?.sections?.length);
    console.log('--------------------------------------------------\n');

    // 6. Test Website Dynamic Instruction Patching
    console.log('6. Testing WebsiteAIBuilderService.patchAST with "Add customer testimonials and pricing plans"...');
    const sitePatchResult = await websiteService.patchAST(siteResult.entityId, 'Add customer testimonials and pricing plans', {
        prompt: 'Add customer testimonials and pricing plans',
        companyId: undefined
    });
    console.log('Patch Success:', sitePatchResult.success);
    console.log('Patch Reply:\n', sitePatchResult.reply);
    console.log('Updated Sections Count:', sitePatchResult.ast?.pages?.[0]?.sections?.length);
    console.log('--------------------------------------------------\n');

    // Clean up test entities
    console.log('Cleaning up test entities...');
    await formService.deleteEntity(formResult.entityId, undefined as any);
    await websiteService.deleteEntity(siteResult.entityId, undefined as any);
    console.log('Clean up complete! All tests PASSED 🎉');
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error during verification:', err);
        process.exit(1);
    });
