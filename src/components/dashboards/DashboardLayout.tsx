import React from 'react';
import { UserRole } from '@/types/truck';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, User, Clock } from 'lucide-react';

interface DashboardLayoutProps {
  title: string;
  user: { role: UserRole; name: string };
  onLogout: () => void;
  children: React.ReactNode;
}

const DashboardLayout = ({ title, user, onLogout, children }: DashboardLayoutProps) => {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'manager':
        return 'primary';
      case 'client':
        return 'success';
      case 'operator':
        return 'warning';
      case 'driver':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'manager':
        return 'Fleet Manager';
      case 'client':
        return 'Client';
      case 'operator':
        return 'Operator';
      case 'driver':
        return 'Driver';
      default:
        return 'User';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-${getRoleBadgeColor(user.role)}`}>
                  {getRoleTitle(user.role)}
                </Badge>
                <span className="text-sm text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <User className="w-3 h-3" />
                  {user.name}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 h-[calc(100vh-80px)]">
        {children}
      </main>

      {/* Footer */}
      
    </div>
  );
};

export default DashboardLayout;