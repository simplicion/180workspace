const lucide = require('lucide-react');
const imports = ['LayoutDashboard', 'FolderKanban', 'CheckSquare', 'Users', 'Building2', 'LayoutGrid', 'Calendar', 'MessageSquare', 'BarChart3', 'Briefcase', 'Target', 'Star', 'Settings', 'LogOut', 'ChevronDown', 'ChevronRight', 'DollarSign', 'FileText', 'BookOpen', 'Sparkles', 'CalendarDays', 'Clock', 'Receipt', 'FilePlus2', 'HelpCircle', 'Monitor', 'Globe', 'LifeBuoy', 'CreditCard', 'TrendingUp', 'Magnet', 'Landmark', 'PieChart', 'Activity', 'FileSignature', 'Bot', 'Lightbulb', 'UserSquare', 'ClipboardList', 'Palmtree', 'Wallet', 'Banknote', 'Package', 'PlusCircle', 'ChevronLeft', 'Menu', 'Mail', 'FolderOpen', 'Video', 'Database', 'Megaphone', 'Search'];

let missing = false;
imports.forEach(name => {
    if (!lucide[name]) {
        console.log('MISSING ICON IN LUCIDE:', name);
        missing = true;
    }
});
if (!missing) {
    console.log('All icons from lucide-react are valid exports.');
}
