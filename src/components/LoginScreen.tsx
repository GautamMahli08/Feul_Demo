import React from 'react';
import { UserRole } from '@/types/truck';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Shield, Users, Navigation } from 'lucide-react';
import truckHero from '@/assets/al-maha-1.jpg';
import logoPng from '@/assets/main_large.png';

interface LoginScreenProps {
  onLogin: (role: UserRole, name: string) => void;
}

type ColorKey = 'primary' | 'success' | 'warning' | 'accent';

const colorClasses: Record<ColorKey, { bg: string; border: string; text: string }> = {
  primary: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' },
  warning: { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning' },
  accent: { bg: 'bg-accent/10', border: 'border-accent/20', text: 'text-accent' },
};

const roles = [
  {
    role: 'manager' as UserRole,
    title: 'Manager',
    name: 'Gautam Mahli',
    description: 'Full fleet oversight, analytics, and security monitoring',
    icon: Shield,
    color: 'primary' as ColorKey,
  },
  {
    role: 'client' as UserRole,
    title: 'Client',
    name: 'Deepak Mahli',
    description: 'Track your deliveries and verify fuel receipts',
    icon: Users,
    color: 'success' as ColorKey,
  },
  {
    role: 'operator' as UserRole,
    title: 'Dispatcher',
    name: 'Praveen Mahli',
    description: 'Assign trips, monitor routes, and manage operations',
    icon: Navigation,
    color: 'warning' as ColorKey,
  },
  {
    role: 'driver' as UserRole,
    title: 'Driver',
    name: 'Vivek Mahli',
    description: 'View assigned trips and update delivery status',
    icon: Truck,
    color: 'accent' as ColorKey,
  },
];

const LoginScreen = ({ onLogin }: LoginScreenProps) => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Left: Hero */}
        <div className="space-y-6 lg:pr-6">
          {/* Brand pill */}
          <div className="inline-flex items-center gap-3 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border">
            <img src={logoPng} alt="ANPTCO Logo" className="w-6 h-6 object-contain" />
            <span className="text-sm font-medium">ANPTCO</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
            Secure Fuel
            <span className="text-primary block">Delivery</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-lg">
            Real-time fleet monitoring, theft prevention, and intelligent delivery management for the oil industry.
          </p>

          <div className="relative rounded-2xl overflow-hidden shadow-xl">
            <img
              src={truckHero}
              alt="Modern fuel delivery truck"
              className="w-full h-64 lg:h-80 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
          </div>
        </div>

        {/* Right: Login Cards */}
        <div className="space-y-5">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">Choose Your Role</h2>
            
          </div>

          <div className="grid gap-4">
            {roles.map((roleData) => {
              const Icon = roleData.icon;
              const c = colorClasses[roleData.color];
              return (
                <Card
                  key={roleData.role}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer border border-border bg-card/80 backdrop-blur-sm"
                  onClick={() => onLogin(roleData.role, roleData.name)}
                >
                  <CardHeader className="flex flex-row items-center space-y-0 space-x-4 pb-3">
                    <div className={`p-2 rounded-lg border ${c.bg} ${c.border}`}>
                      <Icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{roleData.title}</CardTitle>
                      <CardDescription className="text-muted-foreground font-medium">
                        {roleData.name}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4">
                      {roleData.description}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full hover:bg-primary hover:text-primary-foreground"
                    >
                      Enter as {roleData.title}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Developed by Mahli
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
