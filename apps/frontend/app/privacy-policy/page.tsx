export const metadata = {
    title: 'Privacy Policy | 180Workspace',
    description: 'Privacy Policy for 180Workspace',
};

export default function PrivacyPolicy() {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12">
            <h1 className="text-4xl font-black text-gray-900 mb-8">Privacy Policy</h1>
            
            <div className="prose prose-indigo max-w-none text-gray-600 space-y-6">
                <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>
                
                <p>
                    Welcome to 180Workspace ("we", "our", or "us"). We are committed to protecting your personal information and your right to privacy. 
                    If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us at princegupta3641@gmail.com.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. What information do we collect?</h2>
                <p>
                    We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website or otherwise when you contact us.
                </p>
                <p>
                    The personal information that we collect depends on the context of your interactions with us and the website, the choices you make and the products and features you use. The personal information we collect may include the following:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Names</li>
                    <li>Email Addresses</li>
                    <li>Passwords</li>
                    <li>Google Account Data (when you connect via Google OAuth)</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. How do we use your information?</h2>
                <p>
                    We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations. We indicate the specific processing grounds we rely on next to each purpose listed below:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>To facilitate account creation and logon process.</li>
                    <li>To provide and manage the services (like Google Drive, Docs, Sheets sync).</li>
                    <li>To send administrative information to you.</li>
                    <li>To protect our Services.</li>
                </ul>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Will your information be shared with anyone?</h2>
                <p>
                    We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
                </p>
                
                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Google API Services User Data Policy</h2>
                <p>
                    180Workspace's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-indigo-600 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
                </p>

                <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. How can you contact us about this notice?</h2>
                <p>
                    If you have questions or comments about this notice, you may email us at princegupta3641@gmail.com.
                </p>
            </div>
        </div>
    );
}
