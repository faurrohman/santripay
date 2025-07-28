"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function RecentTransactions() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>SA</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Santri A</p>
          <p className="text-sm text-muted-foreground">
            Pembayaran Iuran Bulanan
          </p>
        </div>
        <div className="ml-auto font-medium">
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>SB</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Santri B</p>
          <p className="text-sm text-muted-foreground">
            Pembayaran Kegiatan
          </p>
        </div>
        <div className="ml-auto font-medium">
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>SC</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Santri C</p>
          <p className="text-sm text-muted-foreground">
            Pembayaran Iuran Bulanan
          </p>
        </div>
        <div className="ml-auto font-medium">
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>SD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Santri D</p>
          <p className="text-sm text-muted-foreground">
            Pembayaran Kegiatan
          </p>
        </div>
        <div className="ml-auto font-medium">
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarFallback>SE</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Santri E</p>
          <p className="text-sm text-muted-foreground">
            Pembayaran Iuran Bulanan
          </p>
        </div>
        <div className="ml-auto font-medium">
          <Badge variant="outline">Pending</Badge>
        </div>
      </div>
    </div>
  );
} 