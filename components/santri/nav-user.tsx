"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

export function NavUser() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2">
              <Dialog>
                <DialogTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
              <AvatarFallback>
                {session.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
                </DialogTrigger>
        <DialogContent>
                  <DialogHeader>
            <DialogTitle>Profil Pengguna</DialogTitle>
            <DialogDescription>
              Informasi akun dan pengaturan
                    </DialogDescription>
                  </DialogHeader>
          <div className="flex items-center gap-4 py-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
              <AvatarFallback>
                {session.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-sm text-muted-foreground">{session.user.email}</p>
                        </div>
                      </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/santri/profil")}
            >
              <User className="mr-2 h-4 w-4" />
              Lihat Profil
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
                      onClick={() => signOut()}
                    >
              <LogOut className="mr-2 h-4 w-4" />
                      Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
  );
}