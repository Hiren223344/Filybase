'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GithubLogo, TwitterLogo, DiscordLogo, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

export const Navbar = () => {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
      className="fixed top-0 left-0 w-full z-50 px-6 py-8 pointer-events-none"
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between pointer-events-auto glass rounded-2xl px-8 py-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 group cursor-pointer">
          <img src="/logo.png" alt="FilyBase Logo" className="h-8 w-auto transition-transform duration-500 group-hover:rotate-12" />
          <span className="font-bold tracking-tighter text-2xl uppercase text-foreground">
            FilyBase
          </span>
        </div>

        {/* Links Section (Asymmetric - pushed slightly right) */}
        <div className="hidden md:flex items-center gap-12 ml-auto mr-24">
          {['Infrastructure', 'Pricing', 'Docs', 'Network'].map((item, i) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              whileHover={{ y: -2 }}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors tracking-wide uppercase"
            >
              {item}
            </motion.a>
          ))}
        </div>

        {/* Action Section */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 text-muted-foreground">
            <TwitterLogo size={20} weight="light" className="hover:text-foreground cursor-pointer transition-colors" />
            <GithubLogo size={20} weight="light" className="hover:text-foreground cursor-pointer transition-colors" />
          </div>
          <Link href="/auth">
            <button className="group flex items-center gap-2 bg-[#10b981] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#0d9668] transition-colors duration-200 active:scale-[0.97]">
              Launch App
              <ArrowRight size={14} weight="bold" className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
