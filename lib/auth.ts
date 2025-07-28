import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    email: string;
    role: string;
  }

  interface Session {
    user: User & {
      id: string;
      username: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("NIS/Username dan password harus diisi");
        }

        // Coba cari user berdasarkan username
        let user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        // Jika tidak ditemukan, cek ke tabel santriId
        if (!user) {
          const santri = await prisma.santri.findUnique({
            where: { santriId: credentials.username }
          });
          if (santri) {
            user = await prisma.user.findUnique({
              where: { id: santri.userId }
        });
          }
        }

        if (!user) {
          throw new Error("NIS/Username atau password salah");
        }

        // Jika admin, hanya boleh login pakai username
        if (user.role === "admin" && user.username !== credentials.username) {
          throw new Error("Admin hanya bisa login dengan username");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("NIS/Username atau password salah");
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
} 