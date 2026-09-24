import type { Viewport } from "next";
import "./gym.css";
import { GymNav } from "./nav";

export const viewport: Viewport = {
  themeColor: "#F4F2ED",
  // Kein Zoom beim Fokussieren von Eingabefeldern.
  maximumScale: 1,
};

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="gym">
      {children}
      <GymNav />
    </div>
  );
}
