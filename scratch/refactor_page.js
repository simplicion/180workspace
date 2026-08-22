const fs = require('fs');
const path = 'apps/frontend/app/(setup)/workspace-setup/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Change useEffect step check
code = code.replace('if (step === 4 && plans.length === 0) {', 'if (step === 3 && plans.length === 0) {');

// 2. Change handleNext for step 2
code = code.replace(`        if (step === 2) {
            // Advancing to app selection, preset recommended apps & modules
            const apps = getRecommendedApps(industry);
            setEnabledApps(apps);
            setEnabledModules(getRecommendedModules(apps, industry));
        }`, `        if (step === 2) {
            // Advancing to plan selection
        }
        
        if (step === 3) {
            if (!selectedPlanId) {
                toast.error("Please select a plan to continue.");
                return;
            }
            // Advancing to app selection, preset core apps and recommended apps if they fit
            const coreApps = ['projects', 'workspace-tools', 'communications'];
            const allRecommended = [...new Set([...coreApps, ...getRecommendedApps(industry)])];
            
            // Determine limit based on selected plan
            const plan = plans.find(p => p.id === selectedPlanId);
            let limit = 999;
            if (plan) {
                if (plan.planName.toLowerCase().includes('kickstart')) limit = 5;
                if (plan.planName.toLowerCase().includes('momentum')) limit = 7;
            }
            
            // Apply limit
            const appsToEnable = allRecommended.slice(0, limit);
            setEnabledApps(appsToEnable);
            setEnabledModules(getRecommendedModules(appsToEnable, industry));
        }`);

// 3. Change toggleApp to enforce limit and locked apps
code = code.replace(`    const toggleApp = (appId: string, isCore: boolean) => {
        if (isCore) return;`, `    const toggleApp = (appId: string, isCore: boolean) => {
        const coreApps = ['projects', 'workspace-tools', 'communications'];
        if (isCore || coreApps.includes(appId)) {
            toast.error("This app is essential and cannot be removed.");
            return;
        }
        
        const plan = plans.find(p => p.id === selectedPlanId);
        let limit = 999;
        if (plan) {
            if (plan.planName.toLowerCase().includes('kickstart')) limit = 5;
            if (plan.planName.toLowerCase().includes('momentum')) limit = 7;
        }`);

code = code.replace(`        setEnabledApps(prev => {
            const isNowEnabled = !prev.includes(appId);`, `        setEnabledApps(prev => {
            const isNowEnabled = !prev.includes(appId);
            if (isNowEnabled && prev.length >= limit) {
                toast.error(\`Your current plan limits you to \${limit} apps.\`);
                return prev;
            }`);

// 4. Swap Step 3 and 4 render blocks
const step3AppsStart = `{step === 3 && !saving && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8 h-full flex flex-col relative"
                            >
                                <button onClick={handleBack} disabled={saving} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-2 w-max">&larr; Back</button>

                                <div className="mb-4 text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Select Your Apps</h3>`;

const step3AppsEnd = `                                        <span>Select Plan</span>
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </button>
                                </div>
                            </motion.div>
                        )}`;

const step4PlanStart = `{step === 4 && !saving && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="p-6 sm:p-8 h-full flex flex-col relative"
                            >
                                <button onClick={handleBack} disabled={saving} className="text-sm font-medium text-gray-400 hover:text-gray-600 mb-2 w-max">&larr; Back</button>
                                
                                <div className="mb-6 text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">Choose Your Plan</h3>`;

const step4PlanEnd = `                                        <span>{saving ? "Creating Workspace..." : "Start 14-Day Free Trial"}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}`;

let appsBlockStartIndex = code.indexOf(step3AppsStart);
let appsBlockEndIndex = code.indexOf(step3AppsEnd) + step3AppsEnd.length;
let planBlockStartIndex = code.indexOf(step4PlanStart);
let planBlockEndIndex = code.indexOf(step4PlanEnd) + step4PlanEnd.length;

if (appsBlockStartIndex === -1 || planBlockStartIndex === -1) {
    console.error("Could not find step 3 or step 4 blocks!");
    process.exit(1);
}

let appsBlock = code.substring(appsBlockStartIndex, appsBlockEndIndex);
let planBlock = code.substring(planBlockStartIndex, planBlockEndIndex);

// Modify apps block to be step 4
appsBlock = appsBlock.replace('step === 3', 'step === 4');
appsBlock = appsBlock.replace('key="step3"', 'key="step4"');
appsBlock = appsBlock.replace('<span>Select Plan</span>', '<span>{saving ? "Creating Workspace..." : "Complete Setup"}</span>');
appsBlock = appsBlock.replace('onClick={handleNext}', 'onClick={completeSetup}');
appsBlock = appsBlock.replace('<ArrowRight className="w-5 h-5 ml-2" />', '{saving ? <LogoLoader className="w-5 h-5 animate-spin ml-2" /> : <Sparkles className="w-5 h-5 ml-2" />}');
// Also need to make sure we don't accidentally leave disabled wrong
// In apps block, disabled={saving} is fine. But wait, in the old completeSetup button, it was disabled={saving || !selectedPlanId}. We can remove that from the apps block, disabled={saving} is enough.
appsBlock = appsBlock.replace('disabled={saving || !selectedPlanId}', 'disabled={saving}');

// Modify plan block to be step 3
planBlock = planBlock.replace('step === 4', 'step === 3');
planBlock = planBlock.replace('key="step4"', 'key="step3"');
planBlock = planBlock.replace('onClick={completeSetup}', 'onClick={handleNext}');
planBlock = planBlock.replace('{saving ? <LogoLoader className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}', '');
planBlock = planBlock.replace('<span>{saving ? "Creating Workspace..." : "Start 14-Day Free Trial"}</span>', '<span>Next Step</span> <ArrowRight className="w-5 h-5 ml-2" />');
planBlock = planBlock.replace('disabled={saving || !selectedPlanId}', 'disabled={!selectedPlanId}');

let beforeApps = code.substring(0, appsBlockStartIndex);
let betweenBlocks = code.substring(appsBlockEndIndex, planBlockStartIndex);
let afterPlan = code.substring(planBlockEndIndex);

code = beforeApps + planBlock + betweenBlocks + appsBlock + afterPlan;

// Fix toggle UI for locked apps in appsBlock. The logic inside mapping APPS_CONFIG
code = code.replace(
`                                                    const isEnabled = enabledApps.includes(app.id);`,
`                                                    const isEnabled = enabledApps.includes(app.id);
                                                    const coreApps = ['projects', 'workspace-tools', 'communications'];
                                                    const isLocked = coreApps.includes(app.id);`
);
code = code.replace(
`                                                {isRecommended && !isEnabled && (`,
`                                                {isLocked && (
                                                    <div className="mt-3 relative z-10">
                                                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md ring-1 ring-gray-200">Required</span>
                                                    </div>
                                                )}
                                                {isRecommended && !isEnabled && !isLocked && (`
);

fs.writeFileSync(path, code);
console.log('Refactor complete!');
