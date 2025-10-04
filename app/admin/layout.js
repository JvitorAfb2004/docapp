"use client";

import { useAuth } from "../../lib/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Users, Key, MessageSquare, BarChart3, LogOut } from "lucide-react";
import { Button } from "../../components/ui/button";

export default function AdminLayout({ children }) {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAdmin) {
      router.push("/");
    }
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      href: "/admin/painel",
    },
    {
      title: "Usuários",
      icon: Users,
      href: "/admin/usuarios",
    },
    {
      title: "Prompts",
      icon: MessageSquare,
      href: "/admin/prompts",
    },
    {
      title: "Tokens",
      icon: Key,
      href: "/admin/openai",
    },
  ];

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleMenuClick = (href) => {
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Menu horizontal */}
        <nav className="hidden md:flex items-center space-x-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.title}
                onClick={() => handleMenuClick(item.href)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-white" : "text-gray-500"
                  }`}
                />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Menu mobile */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
        <nav className="flex space-x-4 overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <button
                key={item.title}
                onClick={() => handleMenuClick(item.href)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-black text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isActive ? "text-white" : "text-gray-500"
                  }`}
                />
                <span>{item.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <main className="p-6">{children}</main>
    </div>
  );
}
