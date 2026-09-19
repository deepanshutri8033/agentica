import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import type { Metadata } from "next";
import {Figtree} from 'next/font/google';
import axios from 'axios'
import Provider from "./provider";

export const metadata: Metadata = {
  title: "Next.js Premium Startup Boilerplate",
  description: "Created using the ultimate interactive Next.js stack generator CLI.",
};

const figtree = Figtree({subsets:['latin']});



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  

  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ margin: 0, padding: 0 }} className={figtree.className}>
          <Provider>
            {children}
          </Provider>
          
        </body>
      </html>
    </ClerkProvider>
  );
}
