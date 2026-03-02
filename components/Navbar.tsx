"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const navItems = [
  { label: "Library", href: "/" },
  { label: "Add New", href: "/books/new" },
];

const Navbar = () => {
  const pathName = usePathname();
  const { user } = useUser();
  return (
    <header className="w-full fixed z-50 bg-('--bg-primary')">
      <div className="wrapper navbar-height py-4 flex justify-between">
        <Link href="/" className="flex gap-0.5 items-center">
          <Image src="/logo.webp" alt="logo" width={42} height={26} />
          <span className="logo-text">Bookfied</span>
        </Link>
        <nav className="w-fit flex gap-7.5 items-center">
          {navItems.map(({ label, href }) => {
            const isActive = pathName === href;
            return (
              <Link
                href={href}
                key={label}
                className={cn(
                  "nav-link-base",
                  isActive ? "nav-link-active" : "text-black hover:opacity-70",
                )}
              >
                {label}
              </Link>
            );
          })}
          <div className="flex items-center gap-7.5">
            <SignedOut>
              <SignInButton />
              <SignUpButton mode="modal">
                <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
                  Sign Up
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <div className="nav-user-link">
                <UserButton />
                {user?.firstName && (
                  <Link href="/subscriptions" className="nav-user-name">
                    {user.firstName}
                  </Link>
                )}
              </div>
            </SignedIn>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
