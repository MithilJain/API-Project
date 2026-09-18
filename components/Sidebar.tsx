import Link from 'next/link';
import { Home, PlaySquare, BarChart2, Code, Settings } from 'lucide-react';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Verification Studio', href: '/studio', icon: PlaySquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart2 },
    { name: 'Developer API', href: '/api-keys', icon: Code },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="h-screen w-64 bg-gray-900 dark:bg-black text-white flex flex-col fixed border-r border-transparent dark:border-gray-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-wider text-blue-400">SAFE-RAG</h1>
        <p className="text-xs text-gray-400 mt-1">Verification Engine</p>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <item.icon className="w-5 h-5 text-gray-400" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}