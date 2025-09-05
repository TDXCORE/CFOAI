'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@kit/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@kit/ui/sheet';
import { DashboardSidebar } from './dashboard-sidebar';

export function DashboardMobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <DashboardSidebar />
      </SheetContent>
    </Sheet>
  );
}