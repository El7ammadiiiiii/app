"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Camera, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  photoUrl?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}

export function ProfileAvatar({
  photoUrl,
  name,
  size = "lg",
  editable = false,
  onEdit,
  className,
}: ProfileAvatarProps) {
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
    xl: "w-28 h-28 text-3xl",
  };

  const editButtonSizes = {
    sm: "w-5 h-5 p-0.5",
    md: "w-6 h-6 p-1",
    lg: "w-8 h-8 p-1.5",
    xl: "w-10 h-10 p-2",
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <motion.div
        className={cn(
          sizes[size],
          "rounded-full border-2 border-primary overflow-hidden",
          "flex items-center justify-center",
          "bg-primary/20"
        )}
        whileHover={editable ? { scale: 1.05 } : undefined}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-primary">
            {name ? getInitials(name) : <User className="w-1/2 h-1/2" />}
          </span>
        )}
      </motion.div>

      {editable && (
        <motion.button
          onClick={onEdit}
          className={cn(
            editButtonSizes[size],
            "absolute bottom-0 right-0",
            "bg-primary text-primary-foreground rounded-full",
            "flex items-center justify-center",
            "shadow-md hover:bg-primary/90 transition-colors"
          )}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Camera className="w-full h-full" />
        </motion.button>
      )}
    </div>
  );
}
