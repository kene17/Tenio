"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ClaimRetrieveButtonProps = {
  claimId: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  loadingText?: string;
  successText?: string;
  errorText?: string;
};

export function ClaimRetrieveButton({
  claimId,
  className,
  children,
  title,
  loadingText = "Loading...",
  successText = "Done",
  errorText = "Unable to request status check."
}: ClaimRetrieveButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setStatusText(null);

    try {
      const response = await fetch(`/api/claims/${claimId}/retrieve`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to trigger retrieval");
      }

      setStatusText(successText);

      router.refresh();
    } catch {
      setStatusText(errorText);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      title={title}
      className={className}
    >
      {isLoading ? loadingText : statusText ?? children}
    </button>
  );
}
