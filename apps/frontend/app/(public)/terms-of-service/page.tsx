export const metadata = {
    title: 'Terms of Service | 180Workspace',
    description: 'Terms of Service for 180Workspace',
};

export default function TermsOfService() {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12">
            <h1 className="text-4xl font-black text-gray-900 mb-8">Terms of Service</h1>
            
            <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                
                <p>
                    These Terms of Service (&quot;Terms&quot;) govern your access to and use of the 180Workspace website and services (&quot;Services&quot;). 
                    By accessing or using the Services, you agree to be bound by these Terms.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
                <p>
                    By accessing and using 180Workspace, you accept and agree to be bound by the terms and provision of this agreement. 
                    In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
                <p>
                    180Workspace provides users with access to a rich collection of resources, including integrated tools for workspace management, integrations with third-party services like Google Drive, Docs, and Sheets. 
                    You understand and agree that the Service may include certain communications from 180Workspace, such as service announcements and administrative messages.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. User Conduct</h2>
                <p>
                    You understand that all information, data, text, software, music, sound, photographs, graphics, video, messages, tags, or other materials (&quot;Content&quot;), whether publicly posted or privately transmitted, are the sole responsibility of the person from whom such Content originated.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Indemnity</h2>
                <p>
                    You agree to indemnify and hold 180Workspace and its subsidiaries, affiliates, officers, agents, employees, partners and licensors harmless from any claim or demand, including reasonable attorneys&apos; fees, made by any third party due to or arising out of Content you submit, post, transmit, modify or otherwise make available through the Service.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Modifications to Service</h2>
                <p>
                    180Workspace reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Service (or any part thereof) with or without notice.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Contact Information</h2>
                <p>
                    If you have any questions about these Terms, please contact us at princegupta3641@gmail.com.
                </p>
            </div>
        </div>
    );
}
