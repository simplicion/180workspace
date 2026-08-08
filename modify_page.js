const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/frontend/app/dashboard/(advertising-app)/advertising/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove tabs
content = content.replace(
  "['overview', 'customize', 'leads', 'tracking', 'tools', 'settings']",
  "['overview', 'leads', 'tools', 'settings']"
);

content = content.replace(
  "{activeTab === 'customize' && <CustomizeTab website={website} onUpdate={fetchWebsiteData} />}\n",
  ""
);

content = content.replace(
  "{activeTab === 'tracking' && <TrackingTab website={website} onUpdate={fetchWebsiteData} />}\n",
  ""
);

// 2. Remove CustomizeTab and TrackingTab functions
content = content.replace(/function CustomizeTab[\s\S]*?function LeadsTab/m, 'function LeadsTab');
content = content.replace(/function TrackingTab[\s\S]*?function ToolsTab/m, 'function ToolsTab');
content = content.replace(/function ColorPicker[\s\S]*?function UTMBuilder/m, 'function UTMBuilder'); // Since ColorPicker is no longer needed

// 3. Update SettingsTab
const newSettingsTab = `function SettingsTab({ website, onUpdate }: { website: any, onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);
    const [pixels, setPixels] = useState(website.pixels || []);
    const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
    const [newPixel, setNewPixel] = useState({ type: 'facebook', pixelId: '', status: 'active' });
    const router = useRouter();

    const handleStatusToggle = async () => {
        try {
            setLoading(true);
            await api.patch(\`/api/websites/\${website.id}\`, { status: website.status === 'active' ? 'inactive' : 'active' });
            toast.success('Website status updated');
            onUpdate();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this website? All data and leads will be permanently removed.')) return;
        try {
            setLoading(true);
            await api.delete(\`/api/websites/\${website.id}\`);
            toast.success('Website deleted successfully');
            router.push('/dashboard/advertising');
        } catch (error) {
            toast.error('Failed to delete website');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePixels = async (updatedPixels: any[]) => {
        try {
            setLoading(true);
            await api.patch(\`/api/websites/\${website.id}\`, { pixels: updatedPixels });
            toast.success('Tracking pixels updated');
            onUpdate();
        } catch (error) {
            toast.error('Failed to update tracking');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPixel = () => {
        const updated = [...pixels, newPixel];
        setPixels(updated);
        handleSavePixels(updated);
        setIsPixelModalOpen(false);
        setNewPixel({ type: 'facebook', pixelId: '', status: 'active' });
    };

    const handleRemovePixel = (index: number) => {
        const updated = pixels.filter((_: any, i: number) => i !== index);
        setPixels(updated);
        handleSavePixels(updated);
    };

    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Website Status Control */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-gray-900">Website Control</h3>
                <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                        <p className="font-bold text-gray-900">Website Status</p>
                        <p className="text-xs text-gray-500 mt-1">Control if your landing page is visible to the public.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            website.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                        )}>
                            {website.status}
                        </span>
                        <button 
                            onClick={handleStatusToggle}
                            disabled={loading}
                            className={clsx(
                                "w-12 h-6 rounded-full relative transition-all",
                                website.status === 'active' ? "bg-indigo-600" : "bg-gray-300"
                            )}
                        >
                            <div className={clsx(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                website.status === 'active' ? "left-7" : "left-1"
                            )} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracking Pixels Section */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Tracking Pixels</h3>
                        <p className="text-xs text-gray-500 mt-1">Add Facebook, Google, or TikTok pixels to track conversions.</p>
                    </div>
                    <button 
                        onClick={() => setIsPixelModalOpen(true)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Pixel
                    </button>
                </div>
                
                {pixels.length > 0 ? (
                    <div className="space-y-3">
                        {pixels.map((pixel: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="font-bold text-gray-900 capitalize">{pixel.type} Pixel</p>
                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{pixel.pixelId}</p>
                                </div>
                                <button 
                                    onClick={() => handleRemovePixel(index)}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center">
                        <Activity className="w-8 h-8 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium text-sm">No tracking pixels added yet.</p>
                    </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="bg-white p-8 rounded-3xl border border-red-50 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Danger Zone</h3>
                </div>
                <p className="text-sm text-gray-500">Once you delete a website, there is no going back. Please be certain.</p>
                <button 
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                >
                    Delete Permanently
                </button>
            </div>

            {/* Pixel Modal */}
            <AnimatePresence>
                {isPixelModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-gray-100"
                        >
                            <h3 className="text-xl font-black text-gray-900 mb-6">Add Tracking Pixel</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Platform</label>
                                    <select 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white transition-all font-medium"
                                        value={newPixel.type}
                                        onChange={(e) => setNewPixel({ ...newPixel, type: e.target.value })}
                                    >
                                        <option value="facebook">Facebook Pixel</option>
                                        <option value="google">Google Analytics</option>
                                        <option value="tiktok">TikTok Pixel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pixel ID</label>
                                    <input 
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white transition-all font-medium"
                                        placeholder="Enter ID..."
                                        value={newPixel.pixelId}
                                        onChange={(e) => setNewPixel({ ...newPixel, pixelId: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsPixelModalOpen(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleAddPixel}
                                        disabled={!newPixel.pixelId || loading}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    >
                                        Add Pixel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}`;

content = content.replace(/function SettingsTab[\s\S]*?function StatCard/m, newSettingsTab + '\n\n// --- Helper Components ---\n\nfunction StatCard');

fs.writeFileSync(filePath, content);
console.log('Successfully updated page.tsx');
