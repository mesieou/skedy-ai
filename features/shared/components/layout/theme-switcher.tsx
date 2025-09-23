"use client";

import { Button } from "@/features/shared/components/ui/button";
// Removed complex dropdown - using simple button for now
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const ICON_SIZE = 16;

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <Button variant="ghost" size={"sm"} onClick={cycleTheme}>
      {theme === "light" ? (
        <Sun
          key="light"
          size={ICON_SIZE}
          className={"text-muted-foreground"}
        />
      ) : theme === "dark" ? (
        <Moon
          key="dark"
          size={ICON_SIZE}
          className={"text-muted-foreground"}
        />
      ) : (
        <Laptop
          key="system"
          size={ICON_SIZE}
          className={"text-muted-foreground"}
        />
      )}
    </Button>
  );
};

export { ThemeSwitcher };
