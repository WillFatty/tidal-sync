import type { Metadata } from "next";
import { Manrope, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
    subsets: ["latin"],
    variable: "--font-display",
    weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
    subsets: ["latin"],
    variable: "--font-body",
    weight: ["300", "400", "500", "600"],
});

const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
    title: "TidalSync — Listen to TIDAL together, in sync",
    description: "Real-time, locked-in TIDAL playback with friends. Create a room, share the code, and listen together.",
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: "#08060a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            className={`bg-[var(--ink)] ${manrope.variable} ${figtree.variable} ${jetbrains.variable}`}
        >
            <body
                className="min-h-screen antialiased"
                style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}
            >
                {children}
            </body>
        </html>
    );
}
