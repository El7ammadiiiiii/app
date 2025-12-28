"use client";

import { useState } from "react";
import ChatArea from "../../components/layout/chat-area";
import { CanvasLayout } from "@/components/layout/CanvasLayout";

export default function AppPage() {
  const [activeAgent, setActiveAgent] = useState<"general" | "institute">("general");

  return (
    <CanvasLayout>
      <ChatArea
        activeAgent={activeAgent}
        onAgentChange={setActiveAgent}
      />
    </CanvasLayout>
  );
}
