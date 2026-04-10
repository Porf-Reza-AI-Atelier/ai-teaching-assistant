'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "next-themes";
import { 
  MessageSquare, 
  Upload, 
  Settings, 
  BarChart2, 
  Eye,
  BookOpen,
  LogOut,
  User
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, resolvedTheme } = useTheme();

  const navItems = [
    {
      name: 'Ask the AI',
      href: '/',
      icon: MessageSquare,
      description: 'Chat with your teaching assistant',
    },
  ];

  const adminItems = [
    {
      name: 'Manage Materials',
      href: '/upload',
      icon: Upload,
      description: 'Admin: Upload course documents',
    },
  ];

  return (
    <div className="w-64 border-r bg-muted/30 dark:bg-muted/10">
      <div className="p-4 border-b bg-background/50 dark:bg-background/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={resolvedTheme === 'dark' ? '/drexel/darktheme.png' : '/drexel/lighttheme.png'}
              alt="Drexel Dragon"
              className="h-10 w-10 object-contain transition-opacity duration-200"
            />
            <div>
              <div className="font-bold text-sm">AI Teaching Assistant</div>
              <div className="text-xs text-muted-foreground">Drexel University</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
      
      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="space-y-4 p-4">
          {/* Student Navigation */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">STUDENT</div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={isActive ? "secondary" : "ghost"} 
                      className="w-full justify-start"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Admin Navigation */}
          <div className="pt-4 border-t border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">ADMIN</div>
            <nav className="space-y-2">
              {adminItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button 
                      variant={isActive ? "secondary" : "ghost"} 
                      className="w-full justify-start text-xs"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="pt-4 border-t border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">SYSTEM</div>
            <Button variant="ghost" className="w-full justify-start text-xs opacity-50 cursor-not-allowed" disabled>
              <BarChart2 className="mr-2 h-4 w-4" />
              Performance
            </Button>
            <Button variant="ghost" className="w-full justify-start text-xs opacity-50 cursor-not-allowed" disabled>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>

          {/* User Info & Sign Out */}
          <div className="pt-4 border-t border-border/50">
            <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">STUDENT</div>
            <div className="bg-primary/10 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-primary" />
                <div className="text-xs">
                  <div className="font-medium text-foreground">{user?.name}</div>
                  <div className="text-muted-foreground">{user?.email}</div>
                  {user?.studentId && (
                    <div className="text-muted-foreground">ID: {user.studentId}</div>
                  )}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 